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

export function isMediaPlaceholderText(text: string): boolean {
  return text === '📷 Foto' || text.startsWith('📎 ') || /^\[arquivo\]/i.test(text.trim());
}

export function normalizeMediaMessageText(
  text: string,
  type: MessageType,
  fileName?: string,
): string {
  const arquivoMatch = text.trim().match(/^\[arquivo\]\s*(.+)$/i);
  if (!arquivoMatch) return text;

  const resolvedName = fileName ?? arquivoMatch[1]?.trim();
  if (type === 'image') return '📷 Foto';
  return resolvedName ? `📎 ${resolvedName}` : '📎 Arquivo';
}

export function extractMediaFileName(
  text: string,
  mediaFileName?: string,
): string | undefined {
  if (mediaFileName?.trim()) return mediaFileName.trim();

  const arquivoMatch = text.trim().match(/^\[arquivo\]\s*(.+)$/i);
  if (arquivoMatch?.[1]?.trim()) return arquivoMatch[1].trim();

  if (text.startsWith('📎 ')) return text.slice(2).trim();
  return undefined;
}
