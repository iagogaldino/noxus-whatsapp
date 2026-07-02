import { Server as HttpServer } from 'node:http';
import jwt from 'jsonwebtoken';
import { Server, Socket } from 'socket.io';
import { env } from '../config/env.js';
import type { AuthPayload } from '../middleware/auth.middleware.js';
import { normalizePhone, resolveInstanceId } from '../services/saas-whatsapp.service.js';
import { saveMessage } from '../services/chat-persistence.service.js';
import { whatsappSocketBridge } from '../services/whatsapp-socket-bridge.js';

export interface ChatMessageReceivedEvent {
  id: string;
  chatId: string;
  text: string;
  senderId: string;
  timestamp: string;
  fromName: string | null;
}

export interface ChatMessageSentEvent {
  id: string;
  chatId: string;
  text: string;
  senderId: string;
  timestamp: string;
  status: 'sent';
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

    socket.on('chat:message:send', async (data: { chatId: string; text: string }, ack) => {
      const trimmed = data.text?.trim();
      if (!trimmed || !data.chatId) {
        ack?.({ ok: false, error: 'Dados inválidos.' });
        return;
      }

      try {
        const result = await whatsappSocketBridge.sendMessage(data.chatId, trimmed);
        if (!result.ok) {
          ack?.({ ok: false, error: result.error ?? 'Falha ao enviar.' });
          return;
        }

        const sent: ChatMessageSentEvent = {
          id: result.messageId ?? `local-${Date.now()}`,
          chatId: normalizePhone(data.chatId),
          text: trimmed,
          senderId: auth.userId,
          timestamp: new Date().toISOString(),
          status: 'sent',
        };

        void resolveInstanceId()
          .then((instanceId) =>
            saveMessage({
              instanceId,
              chatId: sent.chatId,
              externalId: sent.id,
              fromMe: true,
              text: sent.text,
              timestamp: sent.timestamp,
              participantName: sent.chatId,
            }),
          )
          .catch((err) => {
            console.error('[Chat] Erro ao persistir mensagem enviada:', err);
          });

        io?.to('whatsapp-chat').emit('chat:message:sent', sent);
        ack?.({ ok: true, message: sent });
      } catch {
        ack?.({ ok: false, error: 'Falha ao enviar mensagem.' });
      }
    });
  });

  whatsappSocketBridge.onMessageReceived((event) => {
    void handleIncomingMessage(event);
  });

  return io;
}

export function getNoxusSocketServer(): Server | null {
  return io;
}
