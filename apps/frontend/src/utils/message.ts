import { Message, MessageType } from '../types/chat';
import { stripWhatsAppFormatting } from './whatsappText';

export function resolveMessageType(mimeType: string): Exclude<MessageType, 'text'> {
  return mimeType.startsWith('image/') ? 'image' : 'file';
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function getAttachmentPreviewLabel(type: MessageType, fileName?: string): string {
  if (type === 'image') return '📷 Foto';
  if (fileName) return `📎 ${fileName}`;
  return '📎 Arquivo';
}

export function getMessagePreview(message: Message): string {
  const type = message.type ?? 'text';
  if (type === 'text') return stripWhatsAppFormatting(message.text);
  return getAttachmentPreviewLabel(type, message.attachment?.name);
}

export function getMessageType(message: Message): MessageType {
  return message.type ?? 'text';
}
