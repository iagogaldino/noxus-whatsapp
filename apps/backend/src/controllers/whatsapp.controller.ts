import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import type { SaasConversationMessage } from '../types/saas-whatsapp.js';
import { AppError } from '../middleware/error.middleware.js';
import { User } from '../models/User.js';
import * as chatPersistence from '../services/chat-persistence.service.js';
import { syncConversationFromSaas } from '../services/chat-sync.service.js';
import { getMessageMedia } from '../services/chat-media.service.js';
import * as saasWhatsApp from '../services/saas-whatsapp.service.js';
import { emitConversationForwarded } from '../socket/noxus-socket.js';
import { whatsappSocketBridge } from '../services/whatsapp-socket-bridge.js';

const sendMessageSchema = z
  .object({
    phoneNumber: z.string().optional(),
    chatId: z.string().optional(),
    message: z.string().min(1).max(200),
  })
  .refine(
    (data) => {
      const phone = data.phoneNumber?.trim() ?? '';
      const chat = data.chatId?.trim() ?? '';
      return (phone.length >= 10 && phone.length <= 15) || chat.length > 0;
    },
    { message: 'Informe chatId ou phoneNumber válido.' },
  );

const createInstanceSchema = z.object({
  name: z.string().min(1).max(100).optional(),
});

const forwardConversationSchema = z.object({
  sectorId: z.string().min(1),
});

async function getConversationViewer(userId: string): Promise<chatPersistence.ConversationViewer> {
  const user = await User.findById(userId).select('role sectorId').lean();
  return {
    role: user?.role ?? 'employee',
    sectorId: user?.sectorId ? String(user.sectorId) : null,
  };
}

async function getInstanceId(req: Request): Promise<string> {
  const paramId = req.params.id;
  if (paramId) return paramId;
  return saasWhatsApp.resolveInstanceId();
}

export async function listInstances(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const instances = await saasWhatsApp.listInstances();
    res.json(instances);
  } catch (err) {
    next(err);
  }
}

export async function createInstance(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = createInstanceSchema.parse(req.body ?? {});
    const instance = await saasWhatsApp.createInstance(body.name);
    res.status(201).json(instance);
  } catch (err) {
    next(err);
  }
}

export async function startPairing(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const instanceId = await getInstanceId(req);
    const result = await saasWhatsApp.startPairing(instanceId);

    if (result.alreadyConnected || result.statusCode === 200) {
      void whatsappSocketBridge.connect(instanceId);
    }

    res.status(result.statusCode).json(result);
  } catch (err) {
    next(err);
  }
}

export async function getStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const instanceId = await getInstanceId(req);
    const status = await saasWhatsApp.getStatus(instanceId);

    if (status.whatsappReady) {
      void whatsappSocketBridge.connect(instanceId);
    }

    res.json(status);
  } catch (err) {
    next(err);
  }
}

export async function getQr(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const instanceId = await getInstanceId(req);
    const qr = await saasWhatsApp.getQr(instanceId);
    res.json(qr);
  } catch (err) {
    next(err);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const instanceId = await getInstanceId(req);
    await saasWhatsApp.logout(instanceId);
    whatsappSocketBridge.disconnect();
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function getContacts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const instanceId = await saasWhatsApp.resolveInstanceId();
    const filter = req.query.filter === 'all' ? 'all' : 'named';
    const contacts = await saasWhatsApp.getContacts(instanceId, { filter });
    res.json(contacts);
  } catch (err) {
    next(err);
  }
}

export async function listConversations(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const instanceId = await saasWhatsApp.resolveInstanceId();
    const limit = req.query.limit ? Number(req.query.limit) : 200;
    const viewer = await getConversationViewer(req.auth!.userId);
    const conversations = await saasWhatsApp.getConversations(instanceId, {
      limit,
      viewer,
    });
    res.json({ items: conversations });
  } catch (err) {
    next(err);
  }
}

export async function forwardConversation(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = forwardConversationSchema.parse(req.body ?? {});
    const instanceId = await saasWhatsApp.resolveInstanceId();
    const viewer = await getConversationViewer(req.auth!.userId);
    await chatPersistence.assertConversationAccess(instanceId, req.params.chatId, viewer);
    const result = await chatPersistence.forwardConversation(
      instanceId,
      req.params.chatId,
      body.sectorId,
      req.auth!.userId,
    );
    emitConversationForwarded(result);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getConversationMessages(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const instanceId = await saasWhatsApp.resolveInstanceId();
    const jid = req.params.jid;
    const limit = req.query.limit ? Number(req.query.limit) : 20;
    const beforeMessageId = req.query.beforeMessageId as string | undefined;
    const viewer = await getConversationViewer(req.auth!.userId);

    await chatPersistence.assertConversationAccess(instanceId, jid, viewer);

    if (!beforeMessageId) {
      await syncConversationFromSaas(instanceId, jid, Math.max(limit, 50));
    }

    const messages = await chatPersistence.listMessages(instanceId, jid, {
      limit,
      beforeMessageId,
    });

    res.json(messages);
  } catch (err) {
    next(err);
  }
}

export async function sendMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = sendMessageSchema.parse(req.body);
    const instanceId = await saasWhatsApp.resolveInstanceId();
    const viewer = await getConversationViewer(req.auth!.userId);

    const phoneNumber =
      body.phoneNumber && saasWhatsApp.normalizePhone(body.phoneNumber).length >= 10
        ? saasWhatsApp.normalizePhone(body.phoneNumber)
        : await chatPersistence.resolveOutboundPhone(instanceId, body.chatId!);

    const chatId = body.chatId?.trim()
      ? chatPersistence.normalizeChatId(body.chatId)
      : phoneNumber;

    if (body.chatId?.trim()) {
      await chatPersistence.assertConversationAccess(instanceId, chatId, viewer);
    }

    await saasWhatsApp.sendMessage(instanceId, phoneNumber, body.message);

    const messageId = `local-${Date.now()}`;
    await chatPersistence.saveMessage({
      instanceId,
      chatId,
      externalId: messageId,
      fromMe: true,
      text: body.message,
      timestamp: new Date(),
    });

    res.json({ ok: true, messageId });
  } catch (err) {
    next(err);
  }
}

function mediaMessagePreview(mimetype: string, filename: string, caption?: string): string {
  const trimmedCaption = caption?.trim();
  if (trimmedCaption) return trimmedCaption;
  if (mimetype.startsWith('image/')) return '📷 Foto';
  return `📎 ${filename}`;
}

export async function sendMedia(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const file = req.file;
    if (!file?.buffer?.length) {
      throw new AppError(400, 'Arquivo ausente ou vazio.');
    }

    const chatId = typeof req.body.chatId === 'string' ? req.body.chatId.trim() : '';
    const phoneNumberRaw =
      typeof req.body.phoneNumber === 'string' ? req.body.phoneNumber.trim() : '';
    const caption = typeof req.body.caption === 'string' ? req.body.caption.trim() : undefined;

    if (caption && caption.length > 200) {
      throw new AppError(400, 'Legenda deve ter no máximo 200 caracteres.');
    }

    if (!chatId && saasWhatsApp.normalizePhone(phoneNumberRaw).length < 10) {
      throw new AppError(400, 'Informe chatId ou phoneNumber válido.');
    }

    const instanceId = await saasWhatsApp.resolveInstanceId();
    const viewer = await getConversationViewer(req.auth!.userId);
    const phoneNumber =
      saasWhatsApp.normalizePhone(phoneNumberRaw).length >= 10
        ? saasWhatsApp.normalizePhone(phoneNumberRaw)
        : await chatPersistence.resolveOutboundPhone(instanceId, chatId);

    const resolvedChatId = chatId
      ? chatPersistence.normalizeChatId(chatId)
      : phoneNumber;

    if (chatId) {
      await chatPersistence.assertConversationAccess(instanceId, resolvedChatId, viewer);
    }

    await saasWhatsApp.sendMedia(
      instanceId,
      phoneNumber,
      {
        buffer: file.buffer,
        originalname: file.originalname,
        mimetype: file.mimetype || 'application/octet-stream',
      },
      caption,
    );

    const text = mediaMessagePreview(file.mimetype, file.originalname, caption);
    const type = file.mimetype.startsWith('image/') ? 'image' : 'file';

    let latestMedia: SaasConversationMessage | undefined;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const synced = await syncConversationFromSaas(instanceId, resolvedChatId, 10);
      latestMedia = synced.find((message) => message.fromMe && message.mediaUrl);
      if (latestMedia) break;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    if (latestMedia) {
      res.json({ ok: true, messageId: latestMedia.id, message: latestMedia });
      return;
    }

    const messageId = `local-${Date.now()}`;

    await chatPersistence.saveMessage({
      instanceId,
      chatId: resolvedChatId,
      externalId: messageId,
      fromMe: true,
      text,
      type,
      timestamp: new Date(),
      mediaMimeType: file.mimetype || 'application/octet-stream',
    });

    res.json({ ok: true, messageId });
  } catch (err) {
    next(err);
  }
}

export async function getMessageMediaHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const instanceId = await saasWhatsApp.resolveInstanceId();
    const media = await getMessageMedia(instanceId, req.params.messageId);

    res.setHeader('Content-Type', media.mimeType);
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.send(media.buffer);
  } catch (err) {
    next(err);
  }
}

export async function getConnectionStatus(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const instanceId = await saasWhatsApp.resolveInstanceId();
    const status = await saasWhatsApp.getStatus(instanceId);
    res.json({
      instanceId,
      whatsappReady: status.whatsappReady,
      socketConnected: whatsappSocketBridge.isConnected(),
    });
  } catch (err) {
    next(err);
  }
}
