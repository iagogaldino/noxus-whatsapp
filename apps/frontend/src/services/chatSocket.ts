import { io, Socket } from 'socket.io-client';
import { API_BASE, getAuthToken } from './apiClient';

export interface ChatMessageReceivedEvent {
  id: string;
  chatId: string;
  text: string;
  senderId: string;
  timestamp: string;
  fromName: string | null;
  type?: 'text' | 'image' | 'file' | 'audio';
  attachment?: {
    name: string;
    mimeType: string;
    size: number;
  };
}

export interface ChatMessageSentEvent {
  id: string;
  chatId: string;
  text: string;
  senderId: string;
  timestamp: string;
  status: 'sent';
}

export interface ChatConversationForwardedEvent {
  chatId: string;
  assignedSector: { id: string; name: string };
  assignedAt: string;
}

type ReceivedListener = (event: ChatMessageReceivedEvent) => void;
type SentListener = (event: ChatMessageSentEvent) => void;
type ForwardedListener = (event: ChatConversationForwardedEvent) => void;

class ChatSocketService {
  private socket: Socket | null = null;
  private receivedListeners = new Set<ReceivedListener>();
  private sentListeners = new Set<SentListener>();
  private forwardedListeners = new Set<ForwardedListener>();

  connect(): void {
    const token = getAuthToken();
    if (!token) return;

    if (this.socket?.connected) return;

    this.socket?.disconnect();

    const url = API_BASE || window.location.origin;

    this.socket = io(url, {
      path: '/socket.io',
      transports: ['websocket'],
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    this.socket.on('chat:message:received', (event: ChatMessageReceivedEvent) => {
      for (const listener of this.receivedListeners) {
        listener(event);
      }
    });

    this.socket.on('chat:message:sent', (event: ChatMessageSentEvent) => {
      for (const listener of this.sentListeners) {
        listener(event);
      }
    });

    this.socket.on('chat:conversation:forwarded', (event: ChatConversationForwardedEvent) => {
      for (const listener of this.forwardedListeners) {
        listener(event);
      }
    });
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }

  onMessageReceived(listener: ReceivedListener): () => void {
    this.receivedListeners.add(listener);
    return () => this.receivedListeners.delete(listener);
  }

  onMessageSent(listener: SentListener): () => void {
    this.sentListeners.add(listener);
    return () => this.sentListeners.delete(listener);
  }

  onConversationForwarded(listener: ForwardedListener): () => void {
    this.forwardedListeners.add(listener);
    return () => this.forwardedListeners.delete(listener);
  }

  sendMessage(
    chatId: string,
    text: string,
  ): Promise<{ ok: boolean; error?: string; message?: ChatMessageSentEvent }> {
    return new Promise((resolve) => {
      if (!this.socket?.connected) {
        resolve({ ok: false, error: 'Socket não conectado.' });
        return;
      }

      const timeout = setTimeout(() => {
        resolve({ ok: false, error: 'Timeout ao enviar.' });
      }, 15000);

      this.socket.emit(
        'chat:message:send',
        { chatId, text },
        (ack: { ok: boolean; error?: string; message?: ChatMessageSentEvent }) => {
          clearTimeout(timeout);
          resolve(ack ?? { ok: false, error: 'Sem resposta do servidor.' });
        },
      );
    });
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }
}

export const chatSocket = new ChatSocketService();
