import { Server as HttpServer } from 'node:http';
import jwt from 'jsonwebtoken';
import { Server, Socket } from 'socket.io';
import { env } from '../config/env.js';
import type { AuthPayload } from '../middleware/auth.middleware.js';
import { resolveInstanceId } from '../services/saas-whatsapp.service.js';
import { resolveOutboundDestination, saveMessage, buildSaasReplyTo, type ClientReplyToInput } from '../services/chat-persistence.service.js';
import { whatsappSocketBridge } from '../services/whatsapp-socket-bridge.js';

export interface ChatMessageReceivedEvent {
  id: string;
  chatId: string;
  text: string;
  senderId: string;
  timestamp: string;
  fromName: string | null;
  participantName?: string;
  isGroup?: boolean;
  senderName?: string;
  senderJid?: string;
  type?: 'text' | 'image' | 'file' | 'audio';
  reply?: {
    quotedMessageId: string;
    quotedParticipant: string | null;
    quotedText: string;
    quotedType: string;
  };
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
  reply?: {
    quotedMessageId: string;
    quotedParticipant: string | null;
    quotedText: string;
    quotedType: string;
  };
}

export interface ChatConversationForwardedEvent {
  chatId: string;
  assignedSector: { id: string; name: string };
  assignedAt: string;
}

let io: Server | null = null;

function authenticateSocket(socket: Socket): AuthPayload | null {
  const token =
    (socket.handshake.auth?.token as string | undefined) ??
    (socket.handshake.headers.authorization?.replace('Bearer ', ''));

  if (!token) return null;

  try {
    return jwt.verify(token, env.JWT_SECRET) as AuthPayload;
  } catch {
    return null;
  }
}

async function handleIncomingMessage(event: ChatMessageReceivedEvent): Promise<void> {
  console.log('[Chat] Repassando mensagem recebida ao frontend.', {
    messageId: event.id,
    chatId: event.chatId,
    senderId: event.senderId,
    senderName: event.senderName,
    isGroup: event.isGroup,
    type: event.type,
  });
  io?.to('whatsapp-chat').emit('chat:message:received', event);
}

export function createNoxusSocketServer(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: env.CORS_ORIGIN,
      credentials: true,
    },
    path: '/socket.io',
  });

  io.use((socket, next) => {
    const auth = authenticateSocket(socket);
    if (!auth) {
      next(new Error('Não autorizado.'));
      return;
    }
    socket.data.auth = auth;
    next();
  });

  io.on('connection', (socket) => {
    const auth = socket.data.auth as AuthPayload;
    socket.join('whatsapp-chat');

    socket.on(
      'chat:message:send',
      async (
        data: { chatId: string; text: string; replyTo?: ClientReplyToInput },
        ack,
      ) => {
      const trimmed = data.text?.trim();
      if (!trimmed || !data.chatId?.trim()) {
        ack?.({ ok: false, error: 'Dados inválidos.' });
        return;
      }

      try {
        const instanceId = await resolveInstanceId();
        const destination = await resolveOutboundDestination(instanceId, data.chatId);
        const sendTarget = destination.chatJid
          ? { chatJid: destination.chatJid }
          : { phoneNumber: destination.phoneNumber! };
        const saasReplyTo = data.replyTo
          ? buildSaasReplyTo(destination, data.replyTo)
          : undefined;
        const result = await whatsappSocketBridge.sendMessage(sendTarget, trimmed, saasReplyTo);
        if (!result.ok) {
          console.error('[Chat] Falha ao enviar mensagem para o destinatário.', {
            chatId: data.chatId.trim(),
            destination: destination.chatJid ?? destination.phoneNumber,
            hasReplyTo: Boolean(saasReplyTo),
            userId: auth.userId,
            error: result.error ?? 'Falha ao enviar.',
          });
          ack?.({ ok: false, error: result.error ?? 'Falha ao enviar.' });
          return;
        }

        const chatId = destination.chatId;
        const sent: ChatMessageSentEvent = {
          id: result.messageId ?? `local-${Date.now()}`,
          chatId,
          text: trimmed,
          senderId: auth.userId,
          timestamp: new Date().toISOString(),
          status: 'sent',
          reply: saasReplyTo
            ? {
                quotedMessageId: saasReplyTo.messageId,
                quotedParticipant: saasReplyTo.participant,
                quotedText: saasReplyTo.text ?? '',
                quotedType: 'conversation',
              }
            : undefined,
        };

        console.log('[Chat] Mensagem enviada com sucesso para o destinatário.', {
          chatId,
          destination: destination.chatJid ?? destination.phoneNumber,
          isGroup: destination.isGroup,
          hasReplyTo: Boolean(saasReplyTo),
          messageId: sent.id,
          userId: auth.userId,
        });

        void saveMessage({
          instanceId,
          chatId,
          externalId: sent.id,
          fromMe: true,
          text: sent.text,
          timestamp: sent.timestamp,
          outboundJid: destination.chatJid,
          isGroup: destination.isGroup,
          reply: sent.reply,
        }).catch((err) => {
          console.error('[Chat] Erro ao persistir mensagem enviada:', err);
        });

        io?.to('whatsapp-chat').emit('chat:message:sent', sent);
        ack?.({ ok: true, message: sent });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Falha ao enviar mensagem.';
        console.error('[Chat] Erro inesperado ao enviar mensagem para o destinatário.', {
          chatId: data.chatId?.trim(),
          userId: auth.userId,
          error: message,
        });
        ack?.({ ok: false, error: message });
      }
    },
    );
  });

  whatsappSocketBridge.onMessageReceived((event) => {
    void handleIncomingMessage(event);
  });

  return io;
}

export function getNoxusSocketServer(): Server | null {
  return io;
}

export function emitConversationForwarded(event: ChatConversationForwardedEvent): void {
  io?.to('whatsapp-chat').emit('chat:conversation:forwarded', event);
}
