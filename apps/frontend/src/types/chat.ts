export interface User {
  id: string;
  name: string;
  avatar?: string;
  avatarColor?: string;
  status?: string;
}

export type MessageStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed';

export type MessageType = 'text' | 'image' | 'file' | 'audio';

export interface MessageAttachment {
  name: string;
  mimeType: string;
  size: number;
  url: string;
}

export interface MessageReply {
  quotedMessageId: string;
  quotedParticipant: string | null;
  quotedText: string;
  quotedType: string;
}

export interface MessageReplyTarget {
  messageId: string;
  participant?: string | null;
  text?: string;
  authorName?: string;
}

export interface Message {
  id: string;
  chatId: string;
  text: string;
  senderId: string;
  senderJid?: string;
  senderName?: string;
  timestamp: Date;
  status?: MessageStatus;
  type?: MessageType;
  attachment?: MessageAttachment;
  reply?: MessageReply;
}

export interface Conversation {
  id: string;
  participant: User;
  isGroup?: boolean;
  lastMessage: Message;
  unreadCount: number;
  assignedSector?: { id: string; name: string } | null;
}
