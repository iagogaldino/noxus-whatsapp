import { io as ioClient, Socket } from 'socket.io-client';
import { env } from '../config/env.js';
import type { SaasSendMessageAck } from '../types/saas-whatsapp.js';
import {
  type InboundChatMessageEvent,
  persistIncomingMessage,
} from './chat-persistence.service.js';
import { normalizePhone } from './saas-whatsapp.service.js';

type MessageListener = (event: InboundChatMessageEvent) => void;

class WhatsAppSocketBridge {
  private saasSocket: Socket | null = null;
  private instanceId: string | null = null;
  private messageListeners = new Set<MessageListener>();
  private connecting = false;

  onMessageReceived(listener: MessageListener): void {
    this.messageListeners.add(listener);
  }

  isConnected(): boolean {
    return this.saasSocket?.connected ?? false;
  }

  getInstanceId(): string | null {
    return this.instanceId;
  }

  async connect(instanceId: string): Promise<void> {
    if (!env.SAAS_WHATSAPP_API_KEY) return;
    if (this.instanceId === instanceId && this.saasSocket?.connected) return;
    if (this.connecting) return;

    this.connecting = true;
    this.disconnect(false);

    this.instanceId = instanceId;

    this.saasSocket = ioClient(env.SAAS_WHATSAPP_API_URL, {
      path: '/socket.io',
      transports: ['websocket'],
      auth: {
        apiKey: env.SAAS_WHATSAPP_API_KEY,
        instanceId,
      },
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 15000,
      timeout: 15000,
    });

    this.saasSocket.on('whatsapp.message.received', (payload: unknown) => {
      void this.handleIncomingMessage(payload);
    });

    this.saasSocket.on('connect', () => {
      console.log(`[WhatsApp Bridge] Conectado ao SaaS (instância ${instanceId})`);
      this.connecting = false;
    });

    this.saasSocket.on('disconnect', (reason) => {
      console.log(`[WhatsApp Bridge] Desconectado: ${reason}`);
      this.connecting = false;
    });

    this.saasSocket.on('connect_error', (err) => {
      console.error('[WhatsApp Bridge] Erro de conexão:', err.message);
      this.connecting = false;
    });

    this.connecting = false;
  }

  private async handleIncomingMessage(raw: unknown): Promise<void> {
    const event = await persistIncomingMessage(raw);
    if (!event) return;

    console.log(`[Chat] Mensagem salva no banco (${event.chatId})`);

    for (const listener of this.messageListeners) {
      listener(event);
    }
  }

  disconnect(clearInstance = true): void {
    if (this.saasSocket) {
      this.saasSocket.removeAllListeners();
      this.saasSocket.disconnect();
      this.saasSocket = null;
    }

    if (clearInstance) {
      this.instanceId = null;
    }
  }

  sendMessage(
    phoneNumber: string,
    text: string,
  ): Promise<{ ok: boolean; error?: string; messageId?: string }> {
    return new Promise((resolve) => {
      if (!this.saasSocket?.connected) {
        resolve({ ok: false, error: 'Socket WhatsApp não conectado.' });
        return;
      }

      const normalized = normalizePhone(phoneNumber);
      if (normalized.length < 10) {
        resolve({ ok: false, error: 'Número do destinatário inválido.' });
        return;
      }

      const timeout = setTimeout(() => {
        resolve({ ok: false, error: 'Timeout ao enviar mensagem.' });
      }, 15000);

      this.saasSocket.emit(
        'whatsapp.message.send',
        { phoneNumber: normalized, text },
        (ack: SaasSendMessageAck) => {
          clearTimeout(timeout);
          if (ack?.ok === false || ack?.error) {
            resolve({ ok: false, error: ack.error ?? 'Falha ao enviar.' });
            return;
          }
          resolve({ ok: true, messageId: ack?.messageId });
        },
      );
    });
  }
}

export const whatsappSocketBridge = new WhatsAppSocketBridge();

export async function ensureWhatsAppBridgeConnected(): Promise<void> {
  if (!env.SAAS_WHATSAPP_API_KEY) return;
  if (whatsappSocketBridge.isConnected()) return;

  try {
    const { resolveInstanceId, getStatus } = await import('./saas-whatsapp.service.js');
    const instanceId = await resolveInstanceId();
    const status = await getStatus(instanceId);
    if (status.whatsappReady) {
      await whatsappSocketBridge.connect(instanceId);
    }
  } catch (err) {
    console.warn('[WhatsApp Bridge] Falha ao garantir conexão:', err);
  }
}

export async function bootstrapWhatsAppSocket(): Promise<void> {
  await ensureWhatsAppBridgeConnected();
}

const BRIDGE_KEEPALIVE_MS = 30_000;

export function startWhatsAppBridgeKeepalive(): void {
  setInterval(() => {
    void ensureWhatsAppBridgeConnected();
  }, BRIDGE_KEEPALIVE_MS);
}
