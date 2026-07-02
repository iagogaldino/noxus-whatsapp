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

export interface Message {
  id: string;
  chatId: string;
  text: string;
  senderId: string;
  timestamp: Date;
  status?: MessageStatus;
  type?: MessageType;
  attachment?: MessageAttachment;
}

export interface Conversation {
  id: string;
  participant: User;
  lastMessage: Message;
  unreadCount: number;
  assignedSector?: { id: string; name: string } | null;
}
