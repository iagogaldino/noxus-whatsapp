import { env } from '../config/env.js';
import { AppError } from '../middleware/error.middleware.js';
import type {
  SaasConversationMessage,
  SaasConversationMessagesResponse,
  SaasConversationSummary,
  SaasPairingStartResponse,
  SaasSendMessageTarget,
  SaasWhatsAppContact,
  SaasWhatsAppInstance,
  SaasWhatsAppQrResponse,
  SaasWhatsAppStatusResponse,
} from '../types/saas-whatsapp.js';
import { listConversations as listPersistedConversations, type ConversationViewer } from './chat-persistence.service.js';

function ensureApiKey(): void {
  if (!env.SAAS_WHATSAPP_API_KEY) {
    throw new AppError(503, 'Integração WhatsApp não configurada (SAAS_WHATSAPP_API_KEY ausente).');
  }
}

function instancePath(instanceId: string): string {
  return `/api/v1/instances/${encodeURIComponent(instanceId)}`;
}

async function saasRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<{ data: T; status: number }> {
  ensureApiKey();

  const url = `${env.SAAS_WHATSAPP_API_URL}${path}`;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${env.SAAS_WHATSAPP_API_KEY}`,
    ...(options.headers as Record<string, string> | undefined),
  };

  if (options.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
      signal: AbortSignal.timeout(15000),
    });
  } catch (err) {
    if (err instanceof Error && err.name === 'TimeoutError') {
      throw new AppError(504, 'Tempo esgotado ao contactar o serviço WhatsApp.');
    }
    throw new AppError(502, 'Não foi possível contactar o serviço WhatsApp.');
  }

  const body = (await response.json().catch(() => ({}))) as T & { error?: string };

  if (!response.ok) {
    const message = body.error ?? `Erro do serviço WhatsApp (${response.status}).`;
    throw new AppError(response.status >= 500 ? 502 : response.status, message);
  }

  return { data: body, status: response.status };
}

export async function listInstances(): Promise<SaasWhatsAppInstance[]> {
  const { data } = await saasRequest<SaasWhatsAppInstance[] | { items?: SaasWhatsAppInstance[] }>(
    '/api/v1/instances',
  );
  if (Array.isArray(data)) return data;
  return data.items ?? [];
}

export async function createInstance(name = 'Noxustalk'): Promise<SaasWhatsAppInstance> {
  const { data } = await saasRequest<SaasWhatsAppInstance>('/api/v1/instances', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
  return data;
}

export async function resolveInstanceId(): Promise<string> {
  if (env.SAAS_WHATSAPP_INSTANCE_ID) {
    return env.SAAS_WHATSAPP_INSTANCE_ID;
  }

  const instances = await listInstances();
  if (instances.length > 0) {
    return instances[0].id;
  }

  const created = await createInstance();
  return created.id;
}

export async function startPairing(instanceId: string): Promise<SaasPairingStartResponse> {
  const { data, status } = await saasRequest<SaasPairingStartResponse>(
    `${instancePath(instanceId)}/whatsapp/pairing/start`,
    { method: 'POST' },
  );
  return { ...data, statusCode: status === 200 ? 200 : 202 };
}

export async function getStatus(instanceId: string): Promise<SaasWhatsAppStatusResponse> {
  const { data } = await saasRequest<SaasWhatsAppStatusResponse>(
    `${instancePath(instanceId)}/whatsapp/status`,
  );
  return data;
}

export async function getQr(instanceId: string): Promise<SaasWhatsAppQrResponse> {
  const { data } = await saasRequest<SaasWhatsAppQrResponse>(
    `${instancePath(instanceId)}/whatsapp/qr`,
  );
  return data;
}

export async function logout(instanceId: string): Promise<void> {
  await saasRequest(`${instancePath(instanceId)}/whatsapp/logout`, { method: 'POST' });
}

export async function getContacts(
  instanceId: string,
  options: { filter?: 'named' | 'all' } = {},
): Promise<SaasWhatsAppContact[]> {
  const params = options.filter === 'all' ? '?filter=all' : '';
  const { data } = await saasRequest<SaasWhatsAppContact[] | { items?: SaasWhatsAppContact[] }>(
    `${instancePath(instanceId)}/whatsapp/contacts${params}`,
  );
  if (Array.isArray(data)) return data;
  return data.items ?? [];
}

export async function getContactProfilePhotoUrl(
  instanceId: string,
  jid: string,
): Promise<string | null> {
  const { data } = await saasRequest<{ url?: string | null }>(
    `${instancePath(instanceId)}/whatsapp/contacts/${encodeURIComponent(jid)}/profile-photo`,
  );
  return data.url ?? null;
}

export async function getConversations(
  instanceId: string,
  options: { limit?: number; viewer?: ConversationViewer } = {},
): Promise<SaasConversationSummary[]> {
  return listPersistedConversations(instanceId, options.limit ?? 200, options.viewer);
}

export async function getConversationMessages(
  instanceId: string,
  jid: string,
  options: { limit?: number; beforeMessageId?: string } = {},
): Promise<SaasConversationMessagesResponse> {
  const params = new URLSearchParams();
  if (options.limit) params.set('limit', String(options.limit));
  if (options.beforeMessageId) params.set('beforeMessageId', options.beforeMessageId);

  const query = params.toString();
  const path = `${instancePath(instanceId)}/whatsapp/conversations/${encodeURIComponent(jid)}/messages${query ? `?${query}` : ''}`;
  const { data } = await saasRequest<SaasConversationMessagesResponse>(path);
  return data;
}

export async function sendMessage(
  instanceId: string,
  target: SaasSendMessageTarget,
  message: string,
): Promise<void> {
  const body: SaasSendMessageTarget & { message: string } = { message };
  if (target.chatJid?.trim()) {
    body.chatJid = target.chatJid.trim();
  } else if (target.phoneNumber?.trim()) {
    body.phoneNumber = normalizePhone(target.phoneNumber);
  } else {
    throw new AppError(400, 'Informe phoneNumber ou chatJid para envio.');
  }

  await saasRequest(`/api/v1/auth/instances/${encodeURIComponent(instanceId)}/send-code`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export interface SaasMediaFile {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
}

export async function sendMedia(
  instanceId: string,
  phoneNumber: string,
  file: SaasMediaFile,
  caption?: string,
): Promise<void> {
  ensureApiKey();

  const formData = new FormData();
  formData.append('phoneNumber', phoneNumber);
  formData.append(
    'file',
    new Blob([new Uint8Array(file.buffer)], { type: file.mimetype }),
    file.originalname,
  );
  if (caption) {
    formData.append('caption', caption);
  }

  const url = `${env.SAAS_WHATSAPP_API_URL}/api/v1/auth/instances/${encodeURIComponent(instanceId)}/send-media`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.SAAS_WHATSAPP_API_KEY}`,
      },
      body: formData,
      signal: AbortSignal.timeout(120000),
    });
  } catch (err) {
    if (err instanceof Error && err.name === 'TimeoutError') {
      throw new AppError(504, 'Tempo esgotado ao enviar arquivo.');
    }
    throw new AppError(502, 'Não foi possível contactar o serviço WhatsApp.');
  }

  const body = (await response.json().catch(() => ({}))) as { error?: string };

  if (!response.ok) {
    const message = body.error ?? `Erro do serviço WhatsApp (${response.status}).`;
    throw new AppError(response.status >= 500 ? 502 : response.status, message);
  }
}

export function normalizePhone(jidOrPhone: string | number): string {
  const raw = String(jidOrPhone ?? '');
  const base = raw.split('@')[0] ?? raw;
  return base.replace(/\D/g, '');
}

export function resolveSaasMediaUrl(mediaUrl: string): string {
  if (mediaUrl.startsWith('http://') || mediaUrl.startsWith('https://')) {
    return mediaUrl;
  }
  return `${env.SAAS_WHATSAPP_API_URL}${mediaUrl.startsWith('/') ? '' : '/'}${mediaUrl}`;
}

export async function fetchSaasMedia(mediaUrl: string): Promise<{
  buffer: Buffer;
  mimeType: string;
}> {
  ensureApiKey();

  const url = resolveSaasMediaUrl(mediaUrl);
  let response: Response;

  try {
    response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${env.SAAS_WHATSAPP_API_KEY}`,
      },
      signal: AbortSignal.timeout(30000),
    });
  } catch (err) {
    if (err instanceof Error && err.name === 'TimeoutError') {
      throw new AppError(504, 'Tempo esgotado ao carregar mídia.');
    }
    throw new AppError(502, 'Não foi possível carregar a mídia.');
  }

  if (!response.ok) {
    throw new AppError(response.status === 404 ? 404 : 502, 'Mídia indisponível.');
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const mimeType = response.headers.get('content-type') ?? 'application/octet-stream';

  return { buffer, mimeType };
}

export function mapSaasMessageToChat(
  msg: SaasConversationMessage,
  currentUserId: string,
): {
  id: string;
  chatId: string;
  text: string;
  senderId: string;
  timestamp: Date;
  status: 'sent' | 'delivered' | 'read';
  type: 'text' | 'image' | 'file';
} {
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
