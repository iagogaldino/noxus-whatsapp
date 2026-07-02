import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as saasWhatsApp from '../services/saas-whatsapp.service.js';
import { upsertConversation } from '../services/conversation-store.js';
import { whatsappSocketBridge } from '../services/whatsapp-socket-bridge.js';

const sendMessageSchema = z.object({
  phoneNumber: z.string().min(10).max(15),
  message: z.string().min(1).max(200),
});

const createInstanceSchema = z.object({
  name: z.string().min(1).max(100).optional(),
});

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

export async function getContacts(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const instanceId = await saasWhatsApp.resolveInstanceId();
    const contacts = await saasWhatsApp.getContacts(instanceId);
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
    const conversations = await saasWhatsApp.getConversations(instanceId, { limit });
    res.json({ items: conversations });
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
    const messages = await saasWhatsApp.getConversationMessages(instanceId, jid, {
      limit,
      beforeMessageId,
    });

    if (messages.items.length > 0) {
      const lastMessage = messages.items[messages.items.length - 1];
      upsertConversation(jid, lastMessage, saasWhatsApp.normalizePhone(jid));
    }

    res.json(messages);
  } catch (err) {
    next(err);
  }
}

export async function sendMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = sendMessageSchema.parse(req.body);
    const instanceId = await saasWhatsApp.resolveInstanceId();
    await saasWhatsApp.sendMessage(instanceId, body.phoneNumber, body.message);
    res.json({ ok: true });
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
