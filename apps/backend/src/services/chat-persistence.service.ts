import { ChatConversation } from '../models/ChatConversation.js';
import { ChatMessage } from '../models/ChatMessage.js';
import { AppError } from '../middleware/error.middleware.js';
import type {
  SaasConversationMessage,
  SaasConversationMessagesResponse,
  SaasConversationSummary,
  SaasIncomingMessageEvent,
} from '../types/saas-whatsapp.js';
import { normalizePhone } from './saas-whatsapp.service.js';

export function slugifyContactName(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, '-');
}

export function nameAliasChatId(contactName: string): string {
  return `name:${slugifyContactName(contactName)}`;
}

export function participantNameFromChatId(chatId: string): string | null {
  if (!chatId.startsWith('name:')) return null;
  return chatId
    .slice(5)
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function sanitizeParticipantName(
  name: string | undefined | null,
  chatId: string,
): string {
  if (name && !name.startsWith('name:')) return name;
  return participantNameFromChatId(chatId) ?? name ?? chatId;
}

/** Preserva ids `name:*`; telefones são normalizados para dígitos. */
export function normalizeChatId(chatId: string): string {
  if (chatId.startsWith('name:')) return chatId;
  return normalizePhone(chatId) || chatId;
}

export function isValidPhone(phone: string): boolean {
  const digits = normalizePhone(phone);
  return digits.length >= 10 && digits.length <= 15;
}

export function phoneFromChatId(chatId: string): string | null {
  const normalized = normalizeChatId(chatId);
  if (normalized.startsWith('name:')) return null;
  const phone = normalizePhone(normalized);
  return isValidPhone(phone) ? phone : null;
}

function toJid(chatId: string): string {
  if (chatId.startsWith('name:')) return `${chatId}@unknown`;
  return `${normalizePhone(chatId)}@s.whatsapp.net`;
}

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
  const chatId = normalizeChatId(input.chatId);
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
  const resolvedPhone = phoneFromChatId(chatId) ?? existing?.phoneNumber;

  if (!existing || timestamp >= existing.lastMessageAt) {
    await ChatConversation.findOneAndUpdate(
      { instanceId: input.instanceId, chatId },
      {
        instanceId: input.instanceId,
        chatId,
        participantName: sanitizeParticipantName(
          input.participantName ?? existing?.participantName,
          chatId,
        ),
        lastMessageAt: timestamp,
        lastMessageExternalId: input.externalId,
        lastMessageText: input.text,
        lastMessageFromMe: input.fromMe,
        ...(resolvedPhone ? { phoneNumber: resolvedPhone } : {}),
      },
      { upsert: true, new: true },
    );
  } else if (input.participantName && existing.participantName === existing.chatId) {
    existing.participantName = input.participantName;
    if (resolvedPhone) existing.phoneNumber = resolvedPhone;
    await existing.save();
  } else if (resolvedPhone && !existing.phoneNumber) {
    existing.phoneNumber = resolvedPhone;
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

export async function removeSupersededLocalMessages(
  instanceId: string,
  chatId: string,
  saasMessages: SaasConversationMessage[],
): Promise<void> {
  const normalizedChatId = normalizeChatId(chatId);
  const localPlaceholders = await ChatMessage.find({
    instanceId,
    chatId: normalizedChatId,
    fromMe: true,
    externalId: { $regex: /^local-/ },
    $or: [{ mediaUrl: { $exists: false } }, { mediaUrl: null }, { mediaUrl: '' }],
  }).lean();

  if (localPlaceholders.length === 0) return;

  const saasFromMeMedia = saasMessages.filter((message) => message.fromMe && message.mediaUrl);

  for (const local of localPlaceholders) {
    const hasMatch = saasFromMeMedia.some((saas) => {
      const timeDiff = Math.abs(new Date(saas.timestamp).getTime() - local.timestamp.getTime());
      return timeDiff < 120_000;
    });

    if (hasMatch) {
      await ChatMessage.deleteOne({ _id: local._id });
    }
  }
}

export async function getConversation(
  instanceId: string,
  chatId: string,
): Promise<{ participantName: string } | null> {
  const doc = await ChatConversation.findOne({
    instanceId,
    chatId: normalizeChatId(chatId),
  })
    .select('participantName')
    .lean();

  if (!doc) return null;
  return { participantName: doc.participantName };
}

export async function listConversations(
  instanceId: string,
  limit = 200,
): Promise<SaasConversationSummary[]> {
  await deduplicateNameAliasConversations(instanceId);

  const docs = await ChatConversation.find({ instanceId })
    .sort({ lastMessageAt: -1 })
    .limit(limit)
    .lean();

  return docs.map((doc) => ({
    chatId: doc.chatId,
    participantName: sanitizeParticipantName(doc.participantName, doc.chatId),
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
  const normalizedChatId = normalizeChatId(chatId);
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
    chatId: normalizeChatId(chatId),
  });
}

export interface ResolvedIncomingIdentity {
  chatId: string;
  participantName: string;
}

export async function resolveIncomingIdentity(
  payload: SaasIncomingMessageEvent,
  instanceId: string,
): Promise<ResolvedIncomingIdentity | null> {
  const participantName = payload.to?.trim() || 'Desconhecido';

  const fromPhone = normalizePhone(payload.from || '');
  if (fromPhone) {
    return { chatId: fromPhone, participantName: payload.to ?? fromPhone };
  }

  if (payload.jid) {
    const jidPhone = normalizePhone(payload.jid);
    if (jidPhone) {
      return { chatId: jidPhone, participantName: payload.to ?? jidPhone };
    }
  }

  if (payload.to) {
    const phoneFromContacts = await lookupChatIdByContactName(instanceId, payload.to);
    if (phoneFromContacts) {
      return { chatId: phoneFromContacts, participantName: payload.to };
    }
  }

  if (payload.to) {
    return { chatId: nameAliasChatId(payload.to), participantName: payload.to };
  }

  const instanceFallback = normalizePhone(instanceId);
  if (instanceFallback) {
    return { chatId: instanceFallback, participantName };
  }

  return null;
}

async function mergeNameAliasConversation(
  instanceId: string,
  identity: ResolvedIncomingIdentity,
): Promise<void> {
  if (identity.chatId.startsWith('name:') || !identity.participantName) return;

  const aliasChatId = nameAliasChatId(identity.participantName);
  if (aliasChatId === identity.chatId) return;

  const aliasConversation = await ChatConversation.findOne({ instanceId, chatId: aliasChatId });
  if (!aliasConversation) return;

  await ChatMessage.updateMany(
    { instanceId, chatId: aliasChatId },
    { $set: { chatId: identity.chatId, jid: toJid(identity.chatId) } },
  );
  await ChatConversation.deleteOne({ instanceId, chatId: aliasChatId });

  const phone = phoneFromChatId(identity.chatId);
  if (phone) {
    await ChatConversation.updateOne(
      { instanceId, chatId: identity.chatId },
      { $set: { phoneNumber: phone } },
    );
  }
}

async function deduplicateNameAliasConversations(instanceId: string): Promise<void> {
  const aliases = await ChatConversation.find({
    instanceId,
    chatId: { $regex: /^name:/ },
  }).lean();

  for (const alias of aliases) {
    const phoneConversation = await ChatConversation.findOne({
      instanceId,
      participantName: alias.participantName,
      chatId: { $not: { $regex: /^name:/ } },
    }).lean();

    if (!phoneConversation) continue;

    await mergeNameAliasConversation(instanceId, {
      chatId: phoneConversation.chatId,
      participantName: alias.participantName,
    });
  }
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
    return nameAliasChatId(contactName);
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

export interface InboundChatMessageEvent {
  id: string;
  chatId: string;
  text: string;
  senderId: string;
  timestamp: string;
  fromName: string | null;
}

export async function persistIncomingMessage(raw: unknown): Promise<InboundChatMessageEvent | null> {
  const payload = parseIncomingPayload(raw);
  if (!payload) {
    console.warn('[Chat] Payload de mensagem recebida inválido:', raw);
    return null;
  }

  let instanceId = payload.instanceId;
  if (!instanceId) {
    const { resolveInstanceId } = await import('./saas-whatsapp.service.js');
    instanceId = await resolveInstanceId();
  }

  const identity = await resolveIncomingIdentity(payload, instanceId);
  if (!identity) {
    console.warn('[Chat] Mensagem recebida sem identificador do remetente; não persistida.', {
      messageId: payload.messageId,
      from: payload.from,
      jid: payload.jid,
      to: payload.to,
    });
    return null;
  }

  try {
    await mergeNameAliasConversation(instanceId, identity);

    await saveMessage({
      instanceId,
      chatId: identity.chatId,
      externalId: payload.messageId,
      jid: payload.jid,
      fromMe: false,
      text: payload.text,
      timestamp: payload.timestamp,
      participantName: identity.participantName,
    });
  } catch (err) {
    console.error('[Chat] Erro ao persistir mensagem recebida:', err);
    return null;
  }

  return {
    id: payload.messageId,
    chatId: identity.chatId,
    text: payload.text,
    senderId: identity.chatId,
    timestamp: payload.timestamp,
    fromName: identity.participantName,
  };
}

const contactPhoneByName = new Map<string, string>();
const contactIndexLoaded = new Set<string>();

function cacheContactPhone(instanceId: string, label: string, phone: string): void {
  const trimmed = label.trim();
  if (!trimmed || !phone) return;
  contactPhoneByName.set(`${instanceId}:${trimmed.toLowerCase()}`, phone);
  contactPhoneByName.set(`${instanceId}:${slugifyContactName(trimmed)}`, phone);
}

async function loadContactPhoneIndex(instanceId: string): Promise<void> {
  if (contactIndexLoaded.has(instanceId)) return;

  const { getContacts } = await import('./saas-whatsapp.service.js');
  const contacts = await getContacts(instanceId, { filter: 'all' });
  for (const contact of contacts) {
    const phone = normalizePhone(contact.jid ?? contact.phone ?? contact.id);
    if (!isValidPhone(phone)) continue;

    for (const label of [contact.name, contact.notify]) {
      if (label) cacheContactPhone(instanceId, label, phone);
    }
  }
  contactIndexLoaded.add(instanceId);
}

async function lookupChatIdByContactName(
  instanceId: string,
  contactName: string,
): Promise<string | null> {
  const trimmed = contactName.trim();
  if (!trimmed) return null;

  try {
    await loadContactPhoneIndex(instanceId);
  } catch {
    return null;
  }

  return (
    contactPhoneByName.get(`${instanceId}:${trimmed.toLowerCase()}`) ??
    contactPhoneByName.get(`${instanceId}:${slugifyContactName(trimmed)}`) ??
    null
  );
}

export async function resolveOutboundPhone(instanceId: string, chatId: string): Promise<string> {
  const normalizedChatId = normalizeChatId(chatId);

  const directPhone = phoneFromChatId(normalizedChatId);
  if (directPhone) return directPhone;

  const conversation = await ChatConversation.findOne({
    instanceId,
    chatId: normalizedChatId,
  }).lean();

  if (conversation?.phoneNumber && isValidPhone(conversation.phoneNumber)) {
    return normalizePhone(conversation.phoneNumber);
  }

  const namesToTry = new Set<string>();
  const fromConversation = sanitizeParticipantName(conversation?.participantName, normalizedChatId);
  if (fromConversation && !fromConversation.startsWith('name:')) {
    namesToTry.add(fromConversation);
  }
  const fromChatId = participantNameFromChatId(normalizedChatId);
  if (fromChatId) namesToTry.add(fromChatId);

  for (const contactName of namesToTry) {
    const phoneFromContacts = await lookupChatIdByContactName(instanceId, contactName);
    if (!phoneFromContacts) continue;

    if (normalizedChatId.startsWith('name:')) {
      await mergeNameAliasConversation(instanceId, {
        chatId: phoneFromContacts,
        participantName: contactName,
      });
    }

    if (conversation && conversation.participantName?.startsWith('name:')) {
      await ChatConversation.updateOne(
        { instanceId, chatId: phoneFromContacts },
        { $set: { participantName: contactName, phoneNumber: phoneFromContacts } },
      );
    }

    return phoneFromContacts;
  }

  throw new AppError(
    400,
    'Não foi possível resolver o número do contato. Verifique se o contato está na agenda do WhatsApp.',
  );
}
