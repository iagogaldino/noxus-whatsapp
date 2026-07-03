import { Message, MessageType } from '../types/chat';
import { formatMessageDateLabel, toDayKey } from './format';
import { stripWhatsAppFormatting } from './whatsappText';

export function isAudioMimeType(mimeType: string, fileName = ''): boolean {
  return mimeType.startsWith('audio/') || /^voice-note\./i.test(fileName) || /^audio\./i.test(fileName);
}

export function resolveMessageType(mimeType: string, fileName = ''): Exclude<MessageType, 'text'> {
  if (mimeType.startsWith('image/')) return 'image';
  if (isAudioMimeType(mimeType, fileName)) return 'audio';
  return 'file';
}

export function resolveMessageTypeFromApi(
  mediaMimeType: string | undefined,
  mediaFileName: string | undefined,
  fallbackType: string,
): MessageType {
  if (mediaMimeType || mediaFileName) {
    return resolveMessageType(mediaMimeType ?? 'application/octet-stream', mediaFileName ?? '');
  }
  if (fallbackType.includes('image')) return 'image';
  if (fallbackType.includes('audio') || fallbackType.includes('ptt')) return 'audio';
  if (fallbackType.includes('document') || fallbackType.includes('video')) return 'file';
  return 'text';
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function getAttachmentPreviewLabel(type: MessageType, fileName?: string): string {
  if (type === 'image') return '📷 Foto';
  if (type === 'audio') {
    return fileName && /^voice-note\./i.test(fileName) ? '🎤 Nota de voz' : '🎤 Áudio';
  }
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
  return (
    text === '📷 Foto' ||
    text.startsWith('📎 ') ||
    text.startsWith('🎤 ') ||
    /^\[arquivo\]/i.test(text.trim())
  );
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
  if (type === 'audio') {
    return resolvedName && /^voice-note\./i.test(resolvedName) ? '🎤 Nota de voz' : '🎤 Áudio';
  }
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

export type MessageListItem =
  | { type: 'date'; key: string; label: string }
  | { type: 'message'; key: string; message: Message };

export function buildMessageListItems(messages: Message[]): MessageListItem[] {
  const items: MessageListItem[] = [];
  let lastDayKey = '';

  for (const message of messages) {
    const dayKey = toDayKey(message.timestamp);
    if (dayKey !== lastDayKey) {
      items.push({
        type: 'date',
        key: `date-${dayKey}`,
        label: formatMessageDateLabel(message.timestamp),
      });
      lastDayKey = dayKey;
    }
    items.push({ type: 'message', key: message.id, message });
  }

  return items;
}
