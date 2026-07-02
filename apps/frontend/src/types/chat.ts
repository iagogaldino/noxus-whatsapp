export interface User {
  id: string;
  name: string;
  avatar?: string;
  avatarColor?: string;
  status?: string;
}

export type MessageStatus = 'sent' | 'delivered' | 'read';

export interface Message {
  id: string;
  chatId: string;
  text: string;
  senderId: string;
  timestamp: Date;
  status?: MessageStatus;
}

export interface Conversation {
  id: string;
  participant: User;
  lastMessage: Message;
  unreadCount: number;
}
