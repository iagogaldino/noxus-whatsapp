import type { SaasConversationMessage, SaasConversationSummary } from '../types/saas-whatsapp.js';
import { normalizePhone } from './saas-whatsapp.service.js';

const conversations = new Map<string, SaasConversationSummary>();

export function upsertConversation(
  chatId: string,
  message: SaasConversationMessage,
  participantName?: string,
): void {
  const id = normalizePhone(chatId);
  const existing = conversations.get(id);
  conversations.set(id, {
    chatId: id,
    participantName: participantName ?? existing?.participantName ?? id,
    lastMessage: message,
  });
}

export function listStoredConversations(limit = 200): SaasConversationSummary[] {
  return [...conversations.values()]
    .sort(
      (a, b) =>
        new Date(b.lastMessage.timestamp).getTime() - new Date(a.lastMessage.timestamp).getTime(),
    )
    .slice(0, limit);
}
