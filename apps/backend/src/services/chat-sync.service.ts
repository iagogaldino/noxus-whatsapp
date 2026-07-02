import * as chatPersistence from './chat-persistence.service.js';
import * as saasWhatsApp from './saas-whatsapp.service.js';
import type { SaasConversationMessage } from '../types/saas-whatsapp.js';

async function resolveSaasConversationJid(instanceId: string, chatId: string): Promise<string> {
  const phone = chatPersistence.phoneFromChatId(chatId);
  if (phone) return phone;
  return chatPersistence.resolveOutboundPhone(instanceId, chatId);
}

export async function syncConversationFromSaas(
  instanceId: string,
  chatId: string,
  limit = 50,
): Promise<SaasConversationMessage[]> {
  try {
    const jid = await resolveSaasConversationJid(instanceId, chatId);
    const saasMessages = await saasWhatsApp.getConversationMessages(instanceId, jid, { limit });

    if (saasMessages.items.length > 0) {
      const normalizedChatId = chatPersistence.normalizeChatId(chatId);
      const conversation = await chatPersistence.getConversation(instanceId, normalizedChatId);
      const participantName = chatPersistence.sanitizeParticipantName(
        conversation?.participantName,
        normalizedChatId,
      );

      for (const message of saasMessages.items) {
        await chatPersistence.saveMessage({
          instanceId,
          chatId: normalizedChatId,
          externalId: message.id,
          jid: message.jid,
          fromMe: message.fromMe,
          text: message.text,
          type: message.type,
          timestamp: message.timestamp,
          mediaUrl: message.mediaUrl,
          mediaMimeType: message.mediaMimeType,
          mediaFileName: message.mediaFileName,
          mediaSize: message.mediaSize,
          participantName,
        });
      }

      await chatPersistence.removeSupersededLocalMessages(
        instanceId,
        chatId,
        saasMessages.items,
      );
    }

    return saasMessages.items;
  } catch {
    return [];
  }
}
