import { ChatConversation } from '../models/ChatConversation.js';
import { ChatMessage } from '../models/ChatMessage.js';
import type {
  SaasConversationMessage,
  SaasConversationMessagesResponse,
  SaasConversationSummary,
  SaasIncomingMessageEvent,
} from '../types/saas-whatsapp.js';
import { normalizePhone } from './saas-whatsapp.service.js';

export interface PersistMessageInput {
  instanceId: string;
  chatId: string;
  externalId: string;
  jid?: string;
  fromMe: boolean;
  text: string;
  type?: string;
  timestamp: string | Date;
  mediaUrl?: string;
  mediaMimeType?: string;
  participantName?: string;
}

function toJid(chatId: string): string {
  return `${normalizePhone(chatId)}@s.whatsapp.net`;
}

function toSaasMessage(doc: {
  externalId: string;
  jid: string;
  fromMe: boolean;
  timestamp: Date;
  text: string;
  type: string;
  mediaUrl?: string | null;
  mediaMimeType?: string | null;
}): SaasConversationMessage {
  return {
    id: doc.externalId,
    jid: doc.jid,
    fromMe: doc.fromMe,
    timestamp: doc.timestamp.toISOString(),
    text: doc.text,
    type: doc.type,
    mediaUrl: doc.mediaUrl ?? undefined,
    mediaMimeType: doc.mediaMimeType ?? undefined,
  };
}

export async function saveMessage(input: PersistMessageInput): Promise<void> {
  const chatId = normalizePhone(input.chatId);
  const jid = input.jid ?? toJid(chatId);
  const timestamp = new Date(input.timestamp);
  const type = input.type ?? 'conversation';

  await ChatMessage.findOneAndUpdate(
    { instanceId: input.instanceId, externalId: input.externalId },
    {
      instanceId: input.instanceId,
      chatId,
      externalId: input.externalId,
      jid,
      fromMe: input.fromMe,
      text: input.text,
      type,
      timestamp,
      mediaUrl: input.mediaUrl,
      mediaMimeType: input.mediaMimeType,
    },
    { upsert: true, new: true },
  );

  const existing = await ChatConversation.findOne({ instanceId: input.instanceId, chatId });
  if (!existing || timestamp >= existing.lastMessageAt) {
    await ChatConversation.findOneAndUpdate(
      { instanceId: input.instanceId, chatId },
      {
        instanceId: input.instanceId,
        chatId,
        participantName: input.participantName ?? existing?.participantName ?? chatId,
        lastMessageAt: timestamp,
        lastMessageExternalId: input.externalId,
        lastMessageText: input.text,
        lastMessageFromMe: input.fromMe,
      },
      { upsert: true, new: true },
    );
  } else if (input.participantName && existing.participantName === existing.chatId) {
    existing.participantName = input.participantName;
    await existing.save();
  }
}

export async function saveMessages(
  instanceId: string,
  messages: SaasConversationMessage[],
  participantName?: string,
): Promise<void> {
  for (const message of messages) {
    const chatId = normalizePhone(message.jid);
    await saveMessage({
      instanceId,
      chatId,
      externalId: message.id,
      jid: message.jid,
      fromMe: message.fromMe,
      text: message.text,
      type: message.type,
      timestamp: message.timestamp,
      mediaUrl: message.mediaUrl,
      mediaMimeType: message.mediaMimeType,
      participantName: participantName ?? chatId,
    });
  }
}

export async function listConversations(
  instanceId: string,
  limit = 200,
): Promise<SaasConversationSummary[]> {
  const docs = await ChatConversation.find({ instanceId })
    .sort({ lastMessageAt: -1 })
    .limit(limit)
    .lean();

  return docs.map((doc) => ({
    chatId: doc.chatId,
    participantName: doc.participantName,
    lastMessage: {
      id: doc.lastMessageExternalId,
      jid: toJid(doc.chatId),
      fromMe: doc.lastMessageFromMe,
      timestamp: doc.lastMessageAt.toISOString(),
      text: doc.lastMessageText,
      type: 'conversation',
    },
  }));
}

export async function listMessages(
  instanceId: string,
  chatId: string,
  options: { limit?: number; beforeMessageId?: string } = {},
): Promise<SaasConversationMessagesResponse> {
  const normalizedChatId = normalizePhone(chatId);
  const limit = Math.min(Math.max(options.limit ?? 20, 1), 100);

  const filter: Record<string, unknown> = {
    instanceId,
    chatId: normalizedChatId,
  };

  if (options.beforeMessageId) {
    const cursor = await ChatMessage.findOne({
      instanceId,
      externalId: options.beforeMessageId,
    }).lean();

    if (cursor) {
      filter.timestamp = { $lt: cursor.timestamp };
    }
  }

  const docs = await ChatMessage.find(filter)
    .sort({ timestamp: -1 })
    .limit(limit + 1)
    .lean();

  const hasMore = docs.length > limit;
  const page = (hasMore ? docs.slice(0, limit) : docs).reverse();

  return {
    items: page.map((doc) => toSaasMessage(doc)),
    nextCursor: hasMore ? page[0]?.externalId ?? null : null,
  };
}

export async function countMessages(instanceId: string, chatId: string): Promise<number> {
  return ChatMessage.countDocuments({
    instanceId,
    chatId: normalizePhone(chatId),
  });
}

export function resolveIncomingChatId(
  payload: SaasIncomingMessageEvent,
  options: { instanceId?: string } = {},
): string | null {
  const fromPhone = normalizePhone(payload.from || '');
  if (fromPhone) return fromPhone;

  if (payload.jid) {
    const jidPhone = normalizePhone(payload.jid);
    if (jidPhone) return jidPhone;
  }

  const contactName = payload.to?.trim();
  if (contactName) {
    return `name:${contactName.toLowerCase().replace(/\s+/g, '-')}`;
  }

  if (options.instanceId) {
    const instanceFallback = normalizePhone(options.instanceId);
    if (instanceFallback) return instanceFallback;
  }

  return null;
}

export function parseIncomingPayload(raw: unknown): SaasIncomingMessageEvent | null {
  if (!raw || typeof raw !== 'object') return null;

  const data = raw as Record<string, unknown>;
  const nested =
    data.payload && typeof data.payload === 'object'
      ? (data.payload as Record<string, unknown>)
      : data.data && typeof data.data === 'object'
        ? (data.data as Record<string, unknown>)
        : null;

  const source = nested ?? data;
  const messageId = String(source.messageId ?? source.id ?? '');
  const from = String(source.from ?? source.phone ?? source.phoneNumber ?? '');
  const instanceId = String(source.instanceId ?? data.instanceId ?? '');
  const text = String(source.text ?? source.body ?? source.message ?? '');
  const timestamp = String(source.timestamp ?? new Date().toISOString());
  const to = source.to == null ? null : String(source.to);
  const jid = source.jid == null ? undefined : String(source.jid);

  if (!messageId && !text && !from && !jid) return null;

  return {
    messageId: messageId || `incoming-${Date.now()}`,
    from,
    to,
    timestamp,
    text,
    userId: String(source.userId ?? ''),
    instanceId,
    jid,
  };
}

export async function persistIncomingMessage(raw: unknown): Promise<void> {
  const payload = parseIncomingPayload(raw);
  if (!payload) {
    console.warn('[Chat] Payload de mensagem recebida inválido:', raw);
    return;
  }

  let instanceId = payload.instanceId;
  if (!instanceId) {
    const { resolveInstanceId } = await import('./saas-whatsapp.service.js');
    instanceId = await resolveInstanceId();
  }

  let chatId = resolveIncomingChatId(payload, { instanceId });

  if (!normalizePhone(payload.from || '') && !payload.jid && payload.to) {
    const phoneFromContacts = await lookupChatIdByContactName(instanceId, payload.to);
    if (phoneFromContacts) chatId = phoneFromContacts;
  }

  if (!chatId) {
    console.warn('[Chat] Mensagem recebida sem identificador do remetente; não persistida.', {
      messageId: payload.messageId,
      from: payload.from,
      jid: payload.jid,
      to: payload.to,
    });
    return;
  }

  try {
    await saveMessage({
      instanceId,
      chatId,
      externalId: payload.messageId,
      jid: payload.jid,
      fromMe: false,
      text: payload.text,
      timestamp: payload.timestamp,
      participantName: payload.to ?? chatId,
    });
  } catch (err) {
    console.error('[Chat] Erro ao persistir mensagem recebida:', err);
  }
}

const contactPhoneByName = new Map<string, string>();

async function lookupChatIdByContactName(
  instanceId: string,
  contactName: string,
): Promise<string | null> {
  const cacheKey = `${instanceId}:${contactName.toLowerCase().trim()}`;
  const cached = contactPhoneByName.get(cacheKey);
  if (cached) return cached;

  try {
    const { getContacts } = await import('./saas-whatsapp.service.js');
    const contacts = await getContacts(instanceId);
    for (const contact of contacts) {
      const name = (contact.name ?? contact.notify ?? '').toLowerCase().trim();
      const phone = normalizePhone(contact.jid ?? contact.phone ?? contact.id);
      if (!name || !phone) continue;
      contactPhoneByName.set(`${instanceId}:${name}`, phone);
    }
  } catch {
    return null;
  }

  return contactPhoneByName.get(cacheKey) ?? null;
}
