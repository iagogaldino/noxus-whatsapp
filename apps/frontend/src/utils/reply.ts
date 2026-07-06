import type { Message, MessageReply, MessageReplyTarget } from '../types/chat';
import { formatPhoneLabel } from './phone';

export function canReplyToMessage(message: Message): boolean {
  return !message.id.startsWith('client-') && !message.id.startsWith('local-');
}

export function buildReplyTarget(message: Message, authorName?: string): MessageReplyTarget {
  const participant =
    message.senderJid ??
    (message.senderId.includes('@') ? message.senderId : message.senderId || null);

  return {
    messageId: message.id,
    participant,
    text: message.text,
    authorName: authorName ?? message.senderName,
  };
}

export function formatReplyDraftPreview(text: string, type?: string): string {
  const trimmed = text.trim();
  if (trimmed) return trimmed.length > 80 ? `${trimmed.slice(0, 80)}…` : trimmed;
  return formatQuotedPreview('', type ?? 'conversation');
}

export function formatQuotedPreview(quotedText: string, quotedType: string): string {
  const text = quotedText.trim();
  if (text) return text;

  const type = quotedType.toLowerCase();
  if (type.includes('image')) return '📷 Foto';
  if (type.includes('audio') || type.includes('ptt')) return '🎤 Áudio';
  if (type.includes('video')) return '🎬 Vídeo';
  if (type.includes('document') || type.includes('application')) return '📎 Arquivo';
  if (type.includes('sticker')) return '🎨 Figurinha';
  return 'Mensagem';
}

export function formatReplyAuthor(
  reply: MessageReply,
  options: {
    isSent: boolean;
    contactName?: string;
    contactId?: string;
    senderName?: string;
    isGroup?: boolean;
  },
): string | undefined {
  const { isSent, contactName, contactId, senderName, isGroup } = options;
  const participant = reply.quotedParticipant?.trim();
  const contactDigits = (contactId ?? '').replace(/\D/g, '');
  const participantDigits = participant
    ? (participant.split('@')[0]?.replace(/\D/g, '') ?? '')
    : '';

  if (isGroup) {
    if (!participant) return senderName ?? 'Participante';
    if (participant.endsWith('@lid')) {
      return senderName ?? participant.split('@')[0] ?? 'Participante';
    }
    if (participantDigits) {
      if (contactDigits && participantDigits === contactDigits) {
        return senderName ?? contactName ?? formatPhoneLabel(participantDigits);
      }
      return formatPhoneLabel(participantDigits);
    }
    return senderName ?? 'Participante';
  }

  if (!participant) {
    return isSent ? contactName : 'Você';
  }

  const quotedContact =
    Boolean(participantDigits && contactDigits && participantDigits === contactDigits);

  if (isSent) {
    return quotedContact ? contactName ?? formatPhoneLabel(participantDigits) : 'Você';
  }

  return quotedContact ? contactName ?? formatPhoneLabel(participantDigits) : 'Você';
}
