import type { Message } from '../types/chat';
import { authRequest } from './apiClient';

export interface WhatsAppContact {
  id: string;
  jid: string;
  phone?: string;
  notify?: string;
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
  }>;
  nextCursor?: string | null;
}

function normalizePhone(jidOrPhone: string): string {
  const base = jidOrPhone.split('@')[0] ?? jidOrPhone;
  return base.replace(/\D/g, '');
}

export function mapApiMessageToChat(
  msg: ConversationMessagesResponse['items'][number],
  currentUserId: string,
): Message {
  const chatId = normalizePhone(msg.jid);
  return {
    id: msg.id,
    chatId,
    text: msg.text,
    senderId: msg.fromMe ? currentUserId : chatId,
    timestamp: new Date(msg.timestamp),
    status: msg.fromMe ? 'sent' : 'delivered',
    type: msg.mediaUrl ? (msg.mediaMimeType?.startsWith('image/') ? 'image' : 'file') : 'text',
  };
}

export async function fetchContacts(): Promise<WhatsAppContact[]> {
  return authRequest<WhatsAppContact[]>('/api/v1/whatsapp/contacts');
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

export async function sendMessageRest(phoneNumber: string, message: string): Promise<void> {
  await authRequest('/api/v1/whatsapp/messages/send', {
    method: 'POST',
    body: JSON.stringify({ phoneNumber, message }),
  });
}

export { normalizePhone };
