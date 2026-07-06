import { Types } from 'mongoose';
import { ChatConversation } from '../models/ChatConversation.js';
import { ChatMessage } from '../models/ChatMessage.js';
import { AppError } from '../middleware/error.middleware.js';
import { getActiveSectorById, getDefaultSector } from './sector.service.js';
import type {
  SaasConversationMessage,
  SaasConversationMessagesResponse,
  SaasConversationSummary,
  SaasIncomingMedia,
  SaasIncomingMessageEvent,
  SaasIncomingMessageReply,
  SaasSendReplyTo,
} from '../types/saas-whatsapp.js';
import { normalizePhone } from './saas-whatsapp.service.js';
import { saveIncomingMedia, deleteMedia } from './chat-media-gridfs.service.js';
import { assertMediaSize, parseFileBuffer } from '../utils/parse-file-buffer.js';

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

/** Preserva ids `name:*`, grupos `@g.us` e contas `@lid`. */
export function isGroupJid(jid: string): boolean {
  return jid.endsWith('@g.us');
}

export function isLidJid(jid: string): boolean {
  return jid.endsWith('@lid');
}

export function isSaasOutboundJid(jid: string): boolean {
  return isGroupJid(jid) || isLidJid(jid) || jid.endsWith('@s.whatsapp.net');
}

export function lidChatId(jid: string): string {
  return jid.split('@')[0]?.trim() || jid;
}

function conversationLookupIds(chatId: string): string[] {
  const trimmed = chatId.trim();
  const normalized = normalizeChatId(chatId);
  const base = trimmed.split('@')[0] ?? normalized.split('@')[0] ?? trimmed;
  const ids = new Set([trimmed, normalized, base]);
  if (base) {
    ids.add(`${base}@lid`);
    ids.add(`${base}@g.us`);
    ids.add(`${normalizePhone(base)}@s.whatsapp.net`);
  }
  if (isGroupJid(trimmed)) ids.add(trimmed);
  if (isLidJid(trimmed)) ids.add(trimmed);
  return [...ids];
}

async function findConversationRecord(instanceId: string, chatId: string) {
  const lookupIds = conversationLookupIds(chatId);
  return (
    (await ChatConversation.findOne({ instanceId, chatId: { $in: lookupIds } }).lean()) ??
    (await ChatConversation.findOne({ instanceId, outboundJid: { $in: lookupIds } }).lean())
  );
}

export function formatGroupDisplayName(chatJid: string): string {
  const id = chatJid.split('@')[0] ?? chatJid;
  const suffix = id.length > 6 ? id.slice(-6) : id;
  return `Grupo · …${suffix}`;
}

export function normalizeChatId(chatId: string): string {
  if (chatId.startsWith('name:')) return chatId;
  if (isGroupJid(chatId)) return chatId;
  if (isLidJid(chatId)) return lidChatId(chatId);
  return normalizePhone(chatId) || chatId;
}

export function isValidPhone(phone: string): boolean {
  const digits = normalizePhone(phone);
  return digits.length >= 10 && digits.length <= 15;
}

export function phoneFromChatId(chatId: string): string | null {
  const normalized = normalizeChatId(chatId);
  if (normalized.startsWith('name:')) return null;
  if (isGroupJid(normalized)) return null;
  const phone = normalizePhone(normalized);
  return isValidPhone(phone) ? phone : null;
}

function toJid(chatId: string): string {
  if (chatId.startsWith('name:')) return `${chatId}@unknown`;
  if (isGroupJid(chatId)) return chatId;
  if (isLidJid(chatId)) return chatId;
  return `${normalizePhone(chatId)}@s.whatsapp.net`;
}

function resolveSenderId(senderJid?: string, from?: string): string {
  const fromPhone = normalizePhone(from ?? '');
  if (fromPhone) return fromPhone;
  if (senderJid?.trim()) return senderJid.trim();
  return from?.trim() || 'unknown';
}

function messageChatIdFromApi(message: SaasConversationMessage): string {
  if (message.isGroup && message.chatJid) return message.chatJid;
  if (isGroupJid(message.jid)) return message.jid;
  if (message.chatJid && isGroupJid(message.chatJid)) return message.chatJid;
  if (message.chatJid && isLidJid(message.chatJid)) return lidChatId(message.chatJid);
  return normalizePhone(message.chatJid ?? message.jid);
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
  mediaFileName?: string;
  mediaSize?: number;
  mediaGridFsId?: string;
  participantName?: string;
  isGroup?: boolean;
  senderJid?: string;
  senderName?: string;
  outboundJid?: string;
  reply?: SaasIncomingMessageReply;
}

function isAudioMedia(mimeType: string, fileName: string): boolean {
  return mimeType.startsWith('audio/') || /^voice-note\./i.test(fileName) || /^audio\./i.test(fileName);
}

function incomingMediaPreview(mimeType: string, fileName: string, caption?: string): string {
  const trimmedCaption = caption?.trim();
  if (trimmedCaption) return trimmedCaption;
  if (mimeType.startsWith('image/')) return '📷 Foto';
  if (isAudioMedia(mimeType, fileName)) {
    return /^voice-note\./i.test(fileName) ? '🎤 Nota de voz' : '🎤 Áudio';
  }
  return `📎 ${fileName || 'arquivo'}`;
}

function resolveMediaMessageType(mimeType: string, fileName = ''): 'image' | 'audio' | 'file' {
  if (mimeType.startsWith('image/')) return 'image';
  if (isAudioMedia(mimeType, fileName)) return 'audio';
  return 'file';
}

function parseIncomingMedia(raw: unknown): SaasIncomingMedia | undefined {
  if (!raw || typeof raw !== 'object') return undefined;

  const media = raw as Record<string, unknown>;
  const mimeType = String(media.mimeType ?? '');
  const fileName = String(media.fileName ?? 'arquivo');
  const size = Number(media.size ?? 0);
  const fileBuffer = media.fileBuffer;

  if (!fileBuffer) return undefined;

  return {
    fileBuffer,
    mimeType: mimeType || 'application/octet-stream',
    fileName,
    size: Number.isFinite(size) ? size : 0,
  };
}

export function parseIncomingReply(raw: unknown): SaasIncomingMessageReply | undefined {
  if (!raw || typeof raw !== 'object') return undefined;

  const reply = raw as Record<string, unknown>;
  const quotedMessageId = String(reply.quotedMessageId ?? '').trim();
  if (!quotedMessageId) return undefined;

  return {
    quotedMessageId,
    quotedParticipant:
      reply.quotedParticipant == null ? null : String(reply.quotedParticipant),
    quotedText: String(reply.quotedText ?? ''),
    quotedType: String(reply.quotedType ?? 'conversation'),
  };
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
  mediaFileName?: string | null;
  mediaSize?: number | null;
  mediaGridFsId?: string | null;
  senderJid?: string | null;
  senderName?: string | null;
  reply?: {
    quotedMessageId?: string | null;
    quotedParticipant?: string | null;
    quotedText?: string | null;
    quotedType?: string | null;
  } | null;
}, conversationIsGroup?: boolean): SaasConversationMessage {
  const isGroup = conversationIsGroup ?? isGroupJid(doc.jid);
  const reply =
    doc.reply?.quotedMessageId != null && String(doc.reply.quotedMessageId).trim()
      ? {
          quotedMessageId: String(doc.reply.quotedMessageId),
          quotedParticipant:
            doc.reply.quotedParticipant == null ? null : String(doc.reply.quotedParticipant),
          quotedText: String(doc.reply.quotedText ?? ''),
          quotedType: String(doc.reply.quotedType ?? 'conversation'),
        }
      : undefined;

  return {
    id: doc.externalId,
    jid: doc.jid,
    fromMe: doc.fromMe,
    timestamp: doc.timestamp.toISOString(),
    text: doc.text,
    type: doc.type,
    isGroup,
    chatJid: isGroup ? doc.jid : undefined,
    senderJid: doc.senderJid ?? undefined,
    senderName: doc.senderName ?? undefined,
    reply,
    mediaUrl: doc.mediaUrl ?? undefined,
    mediaMimeType: doc.mediaMimeType ?? undefined,
    mediaFileName: doc.mediaFileName ?? undefined,
    mediaSize: doc.mediaSize ?? undefined,
    mediaGridFsId: doc.mediaGridFsId ?? undefined,
  };
}

export async function saveMessage(input: PersistMessageInput): Promise<void> {
  const chatId = normalizeChatId(input.chatId);
  const jid = input.jid ?? toJid(chatId);
  const outboundJid =
    input.outboundJid ??
    (isSaasOutboundJid(jid) && (isLidJid(jid) || isGroupJid(jid)) ? jid : undefined);
  const isGroup =
    input.isGroup ??
    (outboundJid && isLidJid(outboundJid) ? false : isGroupJid(chatId));
  const timestamp = new Date(input.timestamp);
  const type = input.type ?? 'conversation';

  const existingMessage = await ChatMessage.findOne({
    instanceId: input.instanceId,
    externalId: input.externalId,
  }).lean();

  let mediaGridFsId = input.mediaGridFsId;
  let mediaMimeType = input.mediaMimeType;
  let mediaFileName = input.mediaFileName;
  let mediaSize = input.mediaSize;
  let mediaUrl = input.mediaUrl;

  if (existingMessage?.mediaGridFsId && !input.mediaGridFsId) {
    mediaGridFsId = existingMessage.mediaGridFsId ?? undefined;
    mediaMimeType = existingMessage.mediaMimeType ?? input.mediaMimeType;
    mediaFileName = existingMessage.mediaFileName ?? input.mediaFileName;
    mediaSize = existingMessage.mediaSize ?? input.mediaSize;
  }

  if (!mediaUrl && existingMessage?.mediaUrl) {
    mediaUrl = existingMessage.mediaUrl;
  }

  const reply = input.reply ?? (existingMessage?.reply?.quotedMessageId
    ? {
        quotedMessageId: String(existingMessage.reply.quotedMessageId),
        quotedParticipant:
          existingMessage.reply.quotedParticipant == null
            ? null
            : String(existingMessage.reply.quotedParticipant),
        quotedText: String(existingMessage.reply.quotedText ?? ''),
        quotedType: String(existingMessage.reply.quotedType ?? 'conversation'),
      }
    : undefined);

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
      mediaUrl,
      mediaMimeType,
      mediaFileName,
      mediaSize,
      mediaGridFsId,
      ...(input.senderJid ? { senderJid: input.senderJid } : {}),
      ...(input.senderName ? { senderName: input.senderName } : {}),
      ...(reply ? { reply } : {}),
    },
    { upsert: true, new: true },
  );

  const existing = await ChatConversation.findOne({ instanceId: input.instanceId, chatId });
  const resolvedPhone = phoneFromChatId(chatId) ?? existing?.phoneNumber;
  const needsDefaultSector = !existing || !existing.assignedSectorId;
  const defaultSector = needsDefaultSector ? await getDefaultSector() : null;

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
        isGroup,
        ...(outboundJid ? { outboundJid } : {}),
        ...(input.fromMe || !input.senderName ? {} : { lastMessageSenderName: input.senderName }),
        ...(resolvedPhone ? { phoneNumber: resolvedPhone } : {}),
        ...(defaultSector ? { assignedSectorId: defaultSector.objectId } : {}),
      },
      { upsert: true, new: true },
    );
  } else if (needsDefaultSector && defaultSector) {
    existing.assignedSectorId = defaultSector.objectId;
    if (input.participantName && existing.participantName === existing.chatId) {
      existing.participantName = input.participantName;
    }
    if (resolvedPhone) existing.phoneNumber = resolvedPhone;
    await existing.save();
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
  options: { chatId?: string; isGroup?: boolean } = {},
): Promise<void> {
  for (const message of messages) {
    const chatId = options.chatId ?? messageChatIdFromApi(message);
    const isGroup = options.isGroup ?? message.isGroup ?? isGroupJid(chatId);
    await saveMessage({
      instanceId,
      chatId,
      externalId: message.id,
      jid: message.chatJid ?? message.jid,
      fromMe: message.fromMe,
      text: message.text,
      type: message.type,
      timestamp: message.timestamp,
      mediaUrl: message.mediaUrl,
      mediaMimeType: message.mediaMimeType,
      mediaFileName: message.mediaFileName,
      mediaSize: message.mediaSize,
      mediaGridFsId: message.mediaGridFsId,
      participantName: participantName ?? chatId,
      isGroup,
      senderJid: message.senderJid,
      senderName: message.senderName,
      reply: message.reply,
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

export interface ConversationViewer {
  role: 'admin' | 'employee';
  sectorId?: string | null;
}

export async function assertConversationAccess(
  instanceId: string,
  chatId: string,
  viewer: ConversationViewer,
): Promise<void> {
  if (viewer.role === 'admin') return;

  if (!viewer.sectorId || !Types.ObjectId.isValid(viewer.sectorId)) {
    throw new AppError(403, 'Acesso restrito ao setor.');
  }

  const doc = await ChatConversation.findOne({
    instanceId,
    chatId: normalizeChatId(chatId),
  })
    .select('assignedSectorId')
    .lean();

  if (!doc) {
    throw new AppError(404, 'Conversa não encontrada.');
  }

  const assignedSectorId = doc.assignedSectorId ? String(doc.assignedSectorId) : null;
  if (assignedSectorId !== viewer.sectorId) {
    throw new AppError(403, 'Acesso restrito ao setor.');
  }
}

export async function listConversations(
  instanceId: string,
  limit = 200,
  viewer?: ConversationViewer,
): Promise<SaasConversationSummary[]> {
  await deduplicateNameAliasConversations(instanceId);

  const filter: Record<string, unknown> = { instanceId };

  if (viewer && viewer.role !== 'admin') {
    if (!viewer.sectorId || !Types.ObjectId.isValid(viewer.sectorId)) {
      filter.assignedSectorId = { $in: [] };
    } else {
      filter.assignedSectorId = new Types.ObjectId(viewer.sectorId);
    }
  }

  const docs = await ChatConversation.find(filter)
    .sort({ lastMessageAt: -1 })
    .limit(limit)
    .populate('assignedSectorId', 'name')
    .lean();

  return docs.map((doc) => {
    const assignedSectorDoc =
      doc.assignedSectorId &&
      typeof doc.assignedSectorId === 'object' &&
      'name' in doc.assignedSectorId
        ? (doc.assignedSectorId as { _id: Types.ObjectId; name: string })
        : null;

    return {
      chatId: doc.chatId,
      participantName: sanitizeParticipantName(doc.participantName, doc.chatId),
      isGroup: doc.isGroup ?? isGroupJid(doc.chatId),
      lastMessage: {
        id: doc.lastMessageExternalId,
        jid: toJid(doc.chatId),
        fromMe: doc.lastMessageFromMe,
        timestamp: doc.lastMessageAt.toISOString(),
        text: doc.lastMessageText,
        type: 'conversation',
        isGroup: doc.isGroup ?? isGroupJid(doc.chatId),
        chatJid: isGroupJid(doc.chatId) ? doc.chatId : undefined,
        senderName: doc.lastMessageSenderName ?? undefined,
      },
      assignedSector: assignedSectorDoc
        ? { id: String(assignedSectorDoc._id), name: assignedSectorDoc.name }
        : null,
    };
  });
}

export interface ForwardConversationResult {
  chatId: string;
  assignedSector: { id: string; name: string };
  assignedAt: string;
}

export async function forwardConversation(
  instanceId: string,
  chatId: string,
  sectorId: string,
  assignedByUserId: string,
): Promise<ForwardConversationResult> {
  await getActiveSectorById(sectorId);

  const normalizedChatId = normalizeChatId(chatId);
  const existing = await ChatConversation.findOne({ instanceId, chatId: normalizedChatId })
    .select('assignedSectorId')
    .lean();

  if (!existing) {
    throw new AppError(404, 'Conversa não encontrada.');
  }

  const currentSectorId = existing.assignedSectorId ? String(existing.assignedSectorId) : null;
  if (currentSectorId === sectorId) {
    throw new AppError(400, 'A conversa já está neste setor.');
  }

  const assignedAt = new Date();

  const doc = await ChatConversation.findOneAndUpdate(
    { instanceId, chatId: normalizedChatId },
    {
      assignedSectorId: new Types.ObjectId(sectorId),
      assignedAt,
      assignedBy: new Types.ObjectId(assignedByUserId),
    },
    { new: true },
  )
    .populate('assignedSectorId', 'name')
    .lean();

  if (!doc) {
    throw new AppError(404, 'Conversa não encontrada.');
  }

  const assignedSectorDoc =
    doc.assignedSectorId &&
    typeof doc.assignedSectorId === 'object' &&
    'name' in doc.assignedSectorId
      ? (doc.assignedSectorId as { _id: Types.ObjectId; name: string })
      : null;

  if (!assignedSectorDoc) {
    throw new AppError(500, 'Falha ao encaminhar conversa.');
  }

  return {
    chatId: doc.chatId,
    assignedSector: {
      id: String(assignedSectorDoc._id),
      name: assignedSectorDoc.name,
    },
    assignedAt: assignedAt.toISOString(),
  };
}

export interface DeleteConversationResult {
  deletedMessages: number;
  deletedMediaFiles: number;
}

export async function deleteConversation(
  instanceId: string,
  chatId: string,
): Promise<DeleteConversationResult> {
  const normalizedChatId = normalizeChatId(chatId);

  const existing = await ChatConversation.findOne({ instanceId, chatId: normalizedChatId }).lean();
  if (!existing) {
    throw new AppError(404, 'Conversa não encontrada.');
  }

  const messagesWithMedia = await ChatMessage.find({
    instanceId,
    chatId: normalizedChatId,
    mediaGridFsId: { $exists: true, $ne: null },
  })
    .select('mediaGridFsId')
    .lean();

  let deletedMediaFiles = 0;
  for (const message of messagesWithMedia) {
    if (!message.mediaGridFsId) continue;
    try {
      await deleteMedia(message.mediaGridFsId);
      deletedMediaFiles += 1;
    } catch {
      // Ignora falhas pontuais ao apagar mídia.
    }
  }

  const deleteResult = await ChatMessage.deleteMany({
    instanceId,
    chatId: normalizedChatId,
  });

  await ChatConversation.deleteOne({ instanceId, chatId: normalizedChatId });

  return {
    deletedMessages: deleteResult.deletedCount ?? 0,
    deletedMediaFiles,
  };
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

  const conversation = await ChatConversation.findOne({
    instanceId,
    chatId: normalizedChatId,
  })
    .select('isGroup')
    .lean();

  const conversationIsGroup = conversation?.isGroup ?? isGroupJid(normalizedChatId);

  const hasMore = docs.length > limit;
  const page = (hasMore ? docs.slice(0, limit) : docs).reverse();

  return {
    items: page.map((doc) => toSaasMessage(doc, conversationIsGroup)),
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
  senderId: string;
  senderName?: string;
  isGroup: boolean;
  outboundJid?: string;
}

export async function resolveIncomingIdentity(
  payload: SaasIncomingMessageEvent,
  instanceId: string,
): Promise<ResolvedIncomingIdentity | null> {
  if (payload.isGroup && payload.chatJid && isGroupJid(payload.chatJid)) {
    const chatId = payload.chatJid;
    const senderId = resolveSenderId(payload.senderJid, payload.from);
    const senderName = payload.to?.trim() || undefined;

    const existing = await findConversationRecord(instanceId, chatId);

    const participantName =
      existing?.participantName && !existing.participantName.startsWith('name:')
        ? existing.participantName
        : formatGroupDisplayName(chatId);

    return {
      chatId,
      participantName,
      senderId,
      senderName,
      isGroup: true,
      outboundJid: chatId,
    };
  }

  if (payload.chatJid && isLidJid(payload.chatJid)) {
    const outboundJid = payload.chatJid;
    const chatId = lidChatId(outboundJid);
    const existing = await findConversationRecord(instanceId, chatId);

    console.log('[Chat] Mensagem de conta empresarial (@lid) identificada.', {
      messageId: payload.messageId,
      chatJid: outboundJid,
      senderJid: payload.senderJid,
      participantName: payload.to,
    });

    return {
      chatId: existing?.chatId ?? chatId,
      participantName: payload.to?.trim() || existing?.participantName || 'Contato',
      senderId: payload.senderJid?.trim() || outboundJid,
      senderName: payload.to?.trim() || undefined,
      isGroup: false,
      outboundJid,
    };
  }

  const participantName = payload.to?.trim() || 'Desconhecido';
  const chatJidPhone = payload.chatJid ? normalizePhone(payload.chatJid) : '';
  const fromPhone = normalizePhone(payload.from || '');

  if (chatJidPhone && !isGroupJid(payload.chatJid ?? '') && !isLidJid(payload.chatJid ?? '')) {
    return {
      chatId: chatJidPhone,
      participantName: payload.to ?? chatJidPhone,
      senderId: chatJidPhone,
      isGroup: false,
    };
  }

  if (fromPhone) {
    return {
      chatId: fromPhone,
      participantName: payload.to ?? fromPhone,
      senderId: fromPhone,
      isGroup: false,
    };
  }

  if (payload.jid) {
    if (isGroupJid(payload.jid)) {
      const senderId = resolveSenderId(payload.senderJid, payload.from);
      return {
        chatId: payload.jid,
        participantName: formatGroupDisplayName(payload.jid),
        senderId,
        senderName: payload.to?.trim() || undefined,
        isGroup: true,
      };
    }

    const jidPhone = normalizePhone(payload.jid);
    if (jidPhone) {
      return {
        chatId: jidPhone,
        participantName: payload.to ?? jidPhone,
        senderId: jidPhone,
        isGroup: false,
      };
    }
  }

  if (payload.senderJid) {
    const senderId = resolveSenderId(payload.senderJid, payload.from);
    if (payload.chatJid && isGroupJid(payload.chatJid)) {
      return {
        chatId: payload.chatJid,
        participantName: formatGroupDisplayName(payload.chatJid),
        senderId,
        senderName: payload.to?.trim() || undefined,
        isGroup: true,
      };
    }
  }

  if (payload.to) {
    const phoneFromContacts = await lookupChatIdByContactName(instanceId, payload.to);
    if (phoneFromContacts) {
      return {
        chatId: phoneFromContacts,
        participantName: payload.to,
        senderId: phoneFromContacts,
        isGroup: false,
      };
    }
  }

  if (payload.to) {
    const aliasId = nameAliasChatId(payload.to);
    return {
      chatId: aliasId,
      participantName: payload.to,
      senderId: aliasId,
      isGroup: false,
    };
  }

  const instanceFallback = normalizePhone(instanceId);
  if (instanceFallback) {
    return {
      chatId: instanceFallback,
      participantName,
      senderId: instanceFallback,
      isGroup: false,
    };
  }

  return null;
}

async function mergeNameAliasConversation(
  instanceId: string,
  identity: ResolvedIncomingIdentity,
): Promise<void> {
  if (identity.isGroup || isGroupJid(identity.chatId)) return;
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
      senderId: phoneConversation.chatId,
      isGroup: false,
    });
  }
}

export function resolveIncomingChatId(
  payload: SaasIncomingMessageEvent,
  options: { instanceId?: string } = {},
): string | null {
  if (payload.isGroup && payload.chatJid) return payload.chatJid;
  if (payload.chatJid && isGroupJid(payload.chatJid)) return payload.chatJid;
  if (payload.chatJid && isLidJid(payload.chatJid)) return lidChatId(payload.chatJid);

  const chatJidPhone = payload.chatJid ? normalizePhone(payload.chatJid) : '';
  if (chatJidPhone && !isLidJid(payload.chatJid ?? '')) return chatJidPhone;

  const fromPhone = normalizePhone(payload.from || '');
  if (fromPhone) return fromPhone;

  if (payload.jid) {
    if (isGroupJid(payload.jid)) return payload.jid;
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
  const chatJid = source.chatJid == null ? undefined : String(source.chatJid);
  const senderJid = source.senderJid == null ? undefined : String(source.senderJid);
  const isGroup = source.isGroup === true || (chatJid ? isGroupJid(chatJid) : false);
  const media = parseIncomingMedia(source.media);
  const reply = parseIncomingReply(source.reply);

  if (chatJid && isLidJid(chatJid)) {
    console.log('[Chat] Mensagem recebida de conta empresarial (@lid).', {
      messageId: messageId || undefined,
      chatJid,
      senderJid,
      from: from || undefined,
      participantName: to,
    });
  }

  if (!messageId && !text && !from && !jid && !chatJid && !media) return null;

  return {
    messageId: messageId || `incoming-${Date.now()}`,
    from,
    to,
    timestamp,
    text,
    userId: String(source.userId ?? ''),
    instanceId,
    jid,
    isGroup,
    chatJid,
    senderJid,
    media,
    reply,
  };
}

export interface InboundChatMessageEvent {
  id: string;
  chatId: string;
  text: string;
  senderId: string;
  timestamp: string;
  fromName: string | null;
  isGroup?: boolean;
  senderName?: string;
  senderJid?: string;
  type?: 'text' | 'image' | 'file' | 'audio';
  reply?: SaasIncomingMessageReply;
  attachment?: {
    name: string;
    mimeType: string;
    size: number;
  };
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

  let text = payload.text;
  let messageType: string = 'conversation';
  let eventType: 'text' | 'image' | 'file' | 'audio' = 'text';
  let mediaGridFsId: string | undefined;
  let mediaMimeType: string | undefined;
  let mediaFileName: string | undefined;
  let mediaSize: number | undefined;
  let attachment: InboundChatMessageEvent['attachment'];

  try {
    await mergeNameAliasConversation(instanceId, identity);

    const existingMessage = await ChatMessage.findOne({
      instanceId,
      externalId: payload.messageId,
    }).lean();

    if (payload.media?.fileBuffer) {
      if (existingMessage?.mediaGridFsId) {
        mediaGridFsId = existingMessage.mediaGridFsId;
        mediaMimeType = existingMessage.mediaMimeType ?? payload.media.mimeType;
        mediaFileName = existingMessage.mediaFileName ?? payload.media.fileName;
        mediaSize = existingMessage.mediaSize ?? payload.media.size;
      } else {
        const buffer = parseFileBuffer(payload.media.fileBuffer);
        if (!buffer) {
          console.warn('[Chat] fileBuffer inválido na mensagem recebida:', payload.messageId);
        } else {
          assertMediaSize(buffer);
          const saved = await saveIncomingMedia({
            instanceId,
            messageId: payload.messageId,
            buffer,
            mimeType: payload.media.mimeType,
            fileName: payload.media.fileName,
          });
          mediaGridFsId = saved.gridFsId;
          mediaMimeType = payload.media.mimeType;
          mediaFileName = payload.media.fileName;
          mediaSize = payload.media.size || buffer.length;
        }
      }

      if (mediaGridFsId && mediaMimeType) {
        const resolvedType = resolveMediaMessageType(mediaMimeType, mediaFileName ?? '');
        messageType = resolvedType;
        eventType = resolvedType;
        text = incomingMediaPreview(mediaMimeType, mediaFileName ?? 'arquivo', payload.text);
        attachment = {
          name: mediaFileName ?? 'arquivo',
          mimeType: mediaMimeType,
          size: mediaSize ?? 0,
        };
      }
    } else if (!text.trim()) {
      text = '🎤 Áudio recebido (indisponível)';
      messageType = 'conversation';
      eventType = 'text';
    }

    await saveMessage({
      instanceId,
      chatId: identity.chatId,
      externalId: payload.messageId,
      jid: payload.chatJid ?? payload.jid ?? toJid(identity.chatId),
      fromMe: false,
      text,
      type: messageType,
      timestamp: payload.timestamp,
      mediaGridFsId,
      mediaMimeType,
      mediaFileName,
      mediaSize,
      participantName: identity.participantName,
      isGroup: identity.isGroup,
      senderJid: payload.senderJid,
      senderName: identity.senderName,
      outboundJid: identity.outboundJid,
      reply: payload.reply,
    });
  } catch (err) {
    console.error('[Chat] Erro ao persistir mensagem recebida:', err);
    return null;
  }

  console.log('[Chat] Mensagem recebida e persistida com sucesso.', {
    messageId: payload.messageId,
    chatId: identity.chatId,
    senderId: identity.senderId,
    senderName: identity.senderName,
    isGroup: identity.isGroup,
    type: eventType,
    hasMedia: Boolean(attachment),
    hasReply: Boolean(payload.reply),
    text: text.length > 120 ? `${text.slice(0, 120)}…` : text,
  });

  return {
    id: payload.messageId,
    chatId: identity.chatId,
    text,
    senderId: identity.senderId,
    timestamp: payload.timestamp,
    fromName: identity.isGroup ? identity.senderName ?? null : identity.participantName,
    isGroup: identity.isGroup,
    senderName: identity.senderName,
    senderJid: payload.senderJid,
    type: eventType,
    reply: payload.reply,
    attachment,
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

export interface OutboundDestination {
  chatId: string;
  isGroup: boolean;
  phoneNumber?: string;
  chatJid?: string;
}

export interface ClientReplyToInput {
  messageId: string;
  participant?: string | null;
  text?: string;
}

function normalizeReplyParticipant(
  participant: string | null | undefined,
  destination: OutboundDestination,
): string | null {
  const trimmed = participant?.trim();
  if (!trimmed) {
    return destination.isGroup ? null : destination.chatJid ?? null;
  }
  if (trimmed.includes('@')) return trimmed;

  const digits = normalizePhone(trimmed);
  if (!digits) return trimmed;

  if (destination.chatJid && isLidJid(destination.chatJid) && lidChatId(destination.chatJid) === digits) {
    return destination.chatJid;
  }

  return `${digits}@s.whatsapp.net`;
}

export function buildSaasReplyTo(
  destination: OutboundDestination,
  replyTo: ClientReplyToInput,
): SaasSendReplyTo {
  const messageId = replyTo.messageId.trim();
  if (!messageId) {
    throw new AppError(400, 'replyTo.messageId é obrigatório.');
  }

  const chatJid =
    destination.chatJid ??
    (destination.phoneNumber ? `${destination.phoneNumber}@s.whatsapp.net` : '');

  if (!chatJid) {
    throw new AppError(400, 'Não foi possível resolver o chatJid para a resposta.');
  }

  const participant = normalizeReplyParticipant(replyTo.participant, destination);
  const text = replyTo.text?.trim();

  return {
    messageId,
    chatJid,
    participant,
    ...(text ? { text } : {}),
  };
}

export async function resolveOutboundDestination(
  instanceId: string,
  chatId: string,
): Promise<OutboundDestination> {
  const normalizedChatId = normalizeChatId(chatId);
  const conversation = await findConversationRecord(instanceId, normalizedChatId);
  const resolvedChatId = conversation?.chatId ?? normalizedChatId;

  if (conversation?.outboundJid && isSaasOutboundJid(conversation.outboundJid)) {
    return {
      chatId: resolvedChatId,
      isGroup: isGroupJid(conversation.outboundJid),
      chatJid: conversation.outboundJid,
    };
  }

  if (isGroupJid(normalizedChatId)) {
    return { chatId: resolvedChatId, isGroup: true, chatJid: normalizedChatId };
  }

  if (isLidJid(normalizedChatId)) {
    return { chatId: resolvedChatId, isGroup: false, chatJid: normalizedChatId };
  }

  const lidMessage = await ChatMessage.findOne({
    instanceId,
    chatId: { $in: conversationLookupIds(resolvedChatId) },
    jid: /@lid$/,
  })
    .sort({ timestamp: -1 })
    .select('jid chatId')
    .lean();

  if (lidMessage?.jid && isLidJid(lidMessage.jid)) {
    if (conversation?.isGroup) {
      await ChatConversation.updateOne(
        { instanceId, chatId: resolvedChatId },
        { $set: { isGroup: false, outboundJid: lidMessage.jid } },
      );
    }
    return {
      chatId: lidMessage.chatId,
      isGroup: false,
      chatJid: lidMessage.jid,
    };
  }

  const groupMessage = await ChatMessage.findOne({
    instanceId,
    chatId: { $in: conversationLookupIds(resolvedChatId) },
    jid: /@g\.us$/,
  })
    .sort({ timestamp: -1 })
    .select('jid chatId')
    .lean();

  if (groupMessage?.jid && isGroupJid(groupMessage.jid)) {
    return {
      chatId: groupMessage.chatId,
      isGroup: true,
      chatJid: groupMessage.jid,
    };
  }

  const directPhone = phoneFromChatId(resolvedChatId);
  if (directPhone) {
    return { chatId: resolvedChatId, isGroup: false, phoneNumber: directPhone };
  }

  if (conversation?.phoneNumber && isValidPhone(conversation.phoneNumber)) {
    return {
      chatId: resolvedChatId,
      isGroup: false,
      phoneNumber: normalizePhone(conversation.phoneNumber),
    };
  }

  const namesToTry = new Set<string>();
  const fromConversation = sanitizeParticipantName(
    conversation?.participantName,
    resolvedChatId,
  );
  if (fromConversation && !fromConversation.startsWith('name:')) {
    namesToTry.add(fromConversation);
  }
  const fromChatId = participantNameFromChatId(resolvedChatId);
  if (fromChatId) namesToTry.add(fromChatId);

  for (const contactName of namesToTry) {
    const phoneFromContacts = await lookupChatIdByContactName(instanceId, contactName);
    if (!phoneFromContacts) continue;

    if (resolvedChatId.startsWith('name:')) {
      await mergeNameAliasConversation(instanceId, {
        chatId: phoneFromContacts,
        participantName: contactName,
        senderId: phoneFromContacts,
        isGroup: false,
      });
    }

    if (conversation && conversation.participantName?.startsWith('name:')) {
      await ChatConversation.updateOne(
        { instanceId, chatId: phoneFromContacts },
        { $set: { participantName: contactName, phoneNumber: phoneFromContacts } },
      );
    }

    return {
      chatId: resolvedChatId,
      isGroup: false,
      phoneNumber: phoneFromContacts,
    };
  }

  const fallbackLid = `${resolvedChatId}@lid`;
  if (!isValidPhone(resolvedChatId) && resolvedChatId.length >= 10) {
    return {
      chatId: resolvedChatId,
      isGroup: false,
      chatJid: fallbackLid,
    };
  }

  throw new AppError(
    400,
    'Não foi possível resolver o destino da mensagem. Verifique se o contato está na agenda do WhatsApp.',
  );
}

export async function resolveOutboundSaasJid(instanceId: string, chatId: string): Promise<string> {
  const destination = await resolveOutboundDestination(instanceId, chatId);
  if (destination.chatJid) return destination.chatJid;
  if (destination.phoneNumber) return destination.phoneNumber;
  throw new AppError(400, 'Não foi possível resolver o JID da conversa.');
}

export async function resolveOutboundPhone(instanceId: string, chatId: string): Promise<string> {
  const destination = await resolveOutboundDestination(instanceId, chatId);
  if (destination.phoneNumber) return destination.phoneNumber;
  if (destination.chatJid) return destination.chatJid;
  throw new AppError(400, 'Não foi possível resolver o destinatário da mensagem.');
}
