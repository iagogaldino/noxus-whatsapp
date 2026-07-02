import { ChatMessage } from '../models/ChatMessage.js';
import { AppError } from '../middleware/error.middleware.js';
import { fetchSaasMedia } from './saas-whatsapp.service.js';
import { readMedia } from './chat-media-gridfs.service.js';

export async function getMessageMedia(
  instanceId: string,
  messageId: string,
): Promise<{ buffer: Buffer; mimeType: string }> {
  const doc = await ChatMessage.findOne({ instanceId, externalId: messageId }).lean();
  if (!doc) {
    throw new AppError(404, 'Mídia não encontrada.');
  }

  if (doc.mediaGridFsId) {
    const media = await readMedia(doc.mediaGridFsId);
    return {
      buffer: media.buffer,
      mimeType: doc.mediaMimeType ?? media.mimeType,
    };
  }

  if (doc.mediaUrl) {
    const media = await fetchSaasMedia(doc.mediaUrl);
    return {
      buffer: media.buffer,
      mimeType: doc.mediaMimeType ?? media.mimeType,
    };
  }

  throw new AppError(404, 'Mídia não encontrada.');
}
