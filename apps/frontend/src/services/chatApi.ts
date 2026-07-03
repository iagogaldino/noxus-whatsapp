import type { Message, MessageType } from '../types/chat';
import {
  extractMediaFileName,
  normalizeMediaMessageText,
  resolveMessageTypeFromApi,
} from '../utils/message';
import { formatPhoneLabel, isValidWhatsAppPhone } from '../utils/phone';
import { authRequest, API_BASE, getAuthToken, parseError } from './apiClient';

export interface WhatsAppContact {
  jid: string;
  name: string;
  phone: string;
  notify?: string;
}

export function contactDisplayName(contact: WhatsAppContact): string {
  const notify = contact.notify?.trim();
  const name = contact.name?.trim();
  if (notify) return notify;
  if (name) return name;
  return formatPhoneLabel(contact.phone || normalizePhone(contact.jid));
}

export function contactChatId(contact: WhatsAppContact): string {
  const phone = normalizePhone(contact.phone || contact.jid);
  return phone || contact.jid.split('@')[0] || contact.jid;
}

export interface ConversationMessagesResponse {
  items: Array<{
    id: string;
    jid: string;
    fromMe: boolean;
    timestamp: string;
    text: string;
    type: string;
    isGroup?: boolean;
    chatJid?: string;
    senderJid?: string;
    senderName?: string;
    mediaUrl?: string;
    mediaMimeType?: string;
    mediaFileName?: string;
    mediaSize?: number;
    mediaGridFsId?: string;
  }>;
  nextCursor?: string | null;
}

export interface ConversationSummary {
  chatId: string;
  participantName: string;
  isGroup?: boolean;
  lastMessage: ConversationMessagesResponse['items'][number];
  assignedSector?: { id: string; name: string } | null;
}

export interface ConversationsResponse {
  items: ConversationSummary[];
}

function normalizePhone(jidOrPhone: string): string {
  const base = jidOrPhone.split('@')[0] ?? jidOrPhone;
  return base.replace(/\D/g, '');
}

export function isGroupJid(jid: string): boolean {
  return jid.endsWith('@g.us');
}

export function formatGroupDisplayName(chatJid: string): string {
  const id = chatJid.split('@')[0] ?? chatJid;
  const suffix = id.length > 6 ? id.slice(-6) : id;
  return `Grupo · …${suffix}`;
}

function resolveSenderId(
  msg: ConversationMessagesResponse['items'][number],
  conversationChatId: string,
): string {
  if (msg.fromMe) return '';
  const fromSenderJid = normalizePhone(msg.senderJid ?? '');
  if (fromSenderJid) return fromSenderJid;
  if (msg.senderJid?.trim()) return msg.senderJid.trim();
  return normalizePhone(msg.jid) || conversationChatId;
}

function resolveApiMessageType(
  msg: ConversationMessagesResponse['items'][number],
): Message['type'] {
  return resolveMessageTypeFromApi(msg.mediaMimeType, msg.mediaFileName, msg.type);
}

export function mapApiMessageToChat(
  msg: ConversationMessagesResponse['items'][number],
  currentUserId: string,
  options: { chatId: string; isGroup?: boolean } = { chatId: '' },
): Message {
  const chatId = options.chatId || normalizePhone(msg.chatJid ?? msg.jid);
  const isGroup = options.isGroup ?? msg.isGroup ?? isGroupJid(chatId);
  const type = resolveApiMessageType(msg);
  const fileName =
    extractMediaFileName(msg.text, msg.mediaFileName) ??
    (type === 'image' ? 'foto' : type === 'audio' ? 'audio.ogg' : 'arquivo');
  const hasMedia = Boolean(msg.mediaUrl || msg.mediaMimeType || msg.mediaGridFsId);
  const mediaType: Exclude<MessageType, 'text'> =
    type === 'image' || type === 'audio' || type === 'file' ? type : 'file';
  const text = hasMedia ? normalizeMediaMessageText(msg.text, mediaType, fileName) : msg.text;
  const senderId = msg.fromMe ? currentUserId : resolveSenderId(msg, chatId);

  return {
    id: msg.id,
    chatId,
    text,
    senderId,
    senderName: msg.senderName,
    timestamp: new Date(msg.timestamp),
    status: msg.fromMe ? 'sent' : 'delivered',
    type,
    attachment: hasMedia
      ? {
          url: msg.mediaUrl ?? '',
          mimeType: msg.mediaMimeType ?? 'application/octet-stream',
          name: fileName,
          size: msg.mediaSize ?? 0,
        }
      : undefined,
  };
}

export async function fetchContacts(filter: 'named' | 'all' = 'all'): Promise<WhatsAppContact[]> {
  const data = await authRequest<WhatsAppContact[] | { items?: WhatsAppContact[] }>(
    `/api/v1/whatsapp/contacts?filter=${filter}`,
  );

  const items = Array.isArray(data) ? data : (data.items ?? []);

  return items
    .map((contact) => ({
      jid: contact.jid,
      name: contact.name ?? '',
      phone: contact.phone || normalizePhone(contact.jid),
      notify: contact.notify,
    }))
    .filter((contact) => contactChatId(contact).length > 0);
}

export async function fetchConversations(limit = 200): Promise<ConversationsResponse> {
  return authRequest<ConversationsResponse>(`/api/v1/whatsapp/conversations?limit=${limit}`);
}

export interface SectorOption {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'inactive';
}

export async function fetchActiveSectors(): Promise<SectorOption[]> {
  return authRequest<SectorOption[]>('/api/v1/sectors');
}

export async function forwardConversation(
  chatId: string,
  sectorId: string,
): Promise<{
  chatId: string;
  assignedSector: { id: string; name: string };
  assignedAt: string;
}> {
  return authRequest(`/api/v1/whatsapp/conversations/${encodeURIComponent(chatId)}/forward`, {
    method: 'PATCH',
    body: JSON.stringify({ sectorId }),
  });
}

export async function deleteConversation(chatId: string): Promise<{
  deletedMessages: number;
  deletedMediaFiles: number;
}> {
  return authRequest(`/api/v1/whatsapp/conversations/${encodeURIComponent(chatId)}`, {
    method: 'DELETE',
  });
}

export async function fetchConversationMessages(
  jid: string,
  options: { limit?: number; beforeMessageId?: string } = {},
): Promise<ConversationMessagesResponse> {
  const params = new URLSearchParams();
  if (options.limit) params.set('limit', String(options.limit));
  if (options.beforeMessageId) params.set('beforeMessageId', options.beforeMessageId);

  const query = params.toString();
  const path = `/api/v1/whatsapp/conversations/${encodeURIComponent(jid)}/messages${query ? `?${query}` : ''}`;
  return authRequest<ConversationMessagesResponse>(path);
}

export async function sendMessageRest(chatId: string, message: string): Promise<void> {
  await authRequest('/api/v1/whatsapp/messages/send', {
    method: 'POST',
    body: JSON.stringify({ chatId, message }),
  });
}

export async function sendAttachmentRest(
  chatId: string,
  file: File,
  caption?: string,
): Promise<{
  ok: boolean;
  messageId?: string;
  message?: ConversationMessagesResponse['items'][number];
}> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Não autenticado.');
  }

  const formData = new FormData();
  formData.append('chatId', chatId);
  formData.append('file', file);
  if (caption?.trim()) {
    formData.append('caption', caption.trim());
  }

  const response = await fetch(`${API_BASE}/api/v1/whatsapp/messages/send-media`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
    signal: AbortSignal.timeout(120000),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return response.json() as Promise<{
    ok: boolean;
    messageId?: string;
    message?: ConversationMessagesResponse['items'][number];
  }>;
}

export { normalizePhone };
