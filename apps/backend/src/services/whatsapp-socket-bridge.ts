import { io as ioClient, Socket } from 'socket.io-client';
import { env } from '../config/env.js';
import type { SaasIncomingMessageEvent, SaasSendMessageAck } from '../types/saas-whatsapp.js';
import { normalizePhone } from './saas-whatsapp.service.js';

type MessageListener = (payload: SaasIncomingMessageEvent) => void;

class WhatsAppSocketBridge {
  private saasSocket: Socket | null = null;
  private instanceId: string | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
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
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      timeout: 15000,
    });

    this.saasSocket.on('whatsapp.message.received', (payload: SaasIncomingMessageEvent) => {
      for (const listener of this.messageListeners) {
        listener(payload);
      }
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

  disconnect(clearInstance = true): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

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
    chatId: string,
    text: string,
  ): Promise<{ ok: boolean; error?: string; messageId?: string }> {
    return new Promise((resolve) => {
      if (!this.saasSocket?.connected) {
        resolve({ ok: false, error: 'Socket WhatsApp não conectado.' });
        return;
      }

      const phoneNumber = normalizePhone(chatId);
      const timeout = setTimeout(() => {
        resolve({ ok: false, error: 'Timeout ao enviar mensagem.' });
      }, 15000);

      this.saasSocket.emit(
        'whatsapp.message.send',
        { phoneNumber, text },
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

export async function bootstrapWhatsAppSocket(): Promise<void> {
  if (!env.SAAS_WHATSAPP_API_KEY) return;

  try {
    const { resolveInstanceId, getStatus } = await import('./saas-whatsapp.service.js');
    const instanceId = await resolveInstanceId();
    const status = await getStatus(instanceId);
    if (status.whatsappReady) {
      await whatsappSocketBridge.connect(instanceId);
    }
  } catch (err) {
    console.warn('[WhatsApp Bridge] Bootstrap ignorado:', err);
  }
}
