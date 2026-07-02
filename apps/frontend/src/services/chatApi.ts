import type { Message } from '../types/chat';
import {
  extractMediaFileName,
  normalizeMediaMessageText,
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
    mediaUrl?: string;
    mediaMimeType?: string;
    mediaFileName?: string;
    mediaSize?: number;
  }>;
  nextCursor?: string | null;
}

export interface ConversationSummary {
  chatId: string;
  participantName: string;
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

function resolveApiMessageType(
  msg: ConversationMessagesResponse['items'][number],
): Message['type'] {
  if (msg.mediaUrl || msg.mediaMimeType) {
    return msg.mediaMimeType?.startsWith('image/') ? 'image' : 'file';
  }
  if (msg.type.includes('image')) return 'image';
  if (msg.type.includes('document') || msg.type.includes('video') || msg.type.includes('audio')) {
    return 'file';
  }
  return 'text';
}

export function mapApiMessageToChat(
  msg: ConversationMessagesResponse['items'][number],
  currentUserId: string,
): Message {
  const chatId = normalizePhone(msg.jid);
  const type = resolveApiMessageType(msg);
  const fileName =
    extractMediaFileName(msg.text, msg.mediaFileName) ??
    (type === 'image' ? 'foto' : 'arquivo');
  const hasMedia = Boolean(msg.mediaUrl || msg.mediaMimeType);
  const displayType: Message['type'] = type === 'image' ? 'image' : 'file';
  const text = hasMedia
    ? normalizeMediaMessageText(msg.text, displayType, fileName)
    : msg.text;

  return {
    id: msg.id,
    chatId,
    text,
    senderId: msg.fromMe ? currentUserId : chatId,
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
