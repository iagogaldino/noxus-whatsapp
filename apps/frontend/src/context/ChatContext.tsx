import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { initialConversations, initialMessages } from '../data/mockData';
import { Conversation, Message, User } from '../types/chat';
import {
  getAttachmentPreviewLabel,
  getMessagePreview,
  resolveMessageType,
} from '../utils/message';
import { useAuth } from './AuthContext';

const MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024;

interface ChatContextValue {
  currentUser: User;
  conversations: Conversation[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filteredConversations: Conversation[];
  getMessages: (chatId: string) => Message[];
  getConversation: (chatId: string) => Conversation | undefined;
  sendMessage: (chatId: string, text: string) => void;
  sendAttachment: (chatId: string, file: File, caption?: string) => boolean;
  markAsRead: (chatId: string) => void;
}

const ChatContext = createContext<ChatContextValue | null>(null);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { session } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>(initialConversations);
  const [messagesByChat, setMessagesByChat] = useState<Record<string, Message[]>>(initialMessages);
  const [searchQuery, setSearchQuery] = useState('');

  const currentUser = useMemo<User>(
    () => ({
      id: session?.userId ?? 'me',
      name: session?.name ?? 'Usuário',
      avatarColor: '#128C7E',
      status: 'Disponível',
    }),
    [session],
  );

  const filteredConversations = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return conversations;

    return conversations.filter(
      (conv) =>
        conv.participant.name.toLowerCase().includes(query) ||
        getMessagePreview(conv.lastMessage).toLowerCase().includes(query),
    );
  }, [conversations, searchQuery]);

  const getMessages = useCallback(
    (chatId: string) => messagesByChat[chatId] ?? [],
    [messagesByChat],
  );

  const getConversation = useCallback(
    (chatId: string) => conversations.find((c) => c.id === chatId),
    [conversations],
  );

  const appendMessage = useCallback((chatId: string, message: Message) => {
    setMessagesByChat((prev) => ({
      ...prev,
      [chatId]: [...(prev[chatId] ?? []), message],
    }));

    setConversations((prev) =>
      prev
        .map((conv) =>
          conv.id === chatId ? { ...conv, lastMessage: message, unreadCount: 0 } : conv,
        )
        .sort((a, b) => b.lastMessage.timestamp.getTime() - a.lastMessage.timestamp.getTime()),
    );
  }, []);

  const sendMessage = useCallback(
    (chatId: string, text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      const newMessage: Message = {
        id: `${chatId}-msg-${Date.now()}`,
        chatId,
        text: trimmed,
        senderId: currentUser.id,
        timestamp: new Date(),
        status: 'sent',
        type: 'text',
      };

      appendMessage(chatId, newMessage);
    },
    [appendMessage, currentUser.id],
  );

  const sendAttachment = useCallback(
    (chatId: string, file: File, caption?: string): boolean => {
      if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
        window.alert('Arquivo muito grande. O limite é 10 MB.');
        return false;
      }

      const type = resolveMessageType(file.type || 'application/octet-stream');
      const trimmedCaption = caption?.trim();
      const preview = getAttachmentPreviewLabel(type, file.name);

      const newMessage: Message = {
        id: `${chatId}-msg-${Date.now()}`,
        chatId,
        text: trimmedCaption || preview,
        senderId: currentUser.id,
        timestamp: new Date(),
        status: 'sent',
        type,
        attachment: {
          name: file.name,
          mimeType: file.type || 'application/octet-stream',
          size: file.size,
          url: URL.createObjectURL(file),
        },
      };

      appendMessage(chatId, newMessage);
      return true;
    },
    [appendMessage, currentUser.id],
  );

  const markAsRead = useCallback((chatId: string) => {
    setConversations((prev) =>
      prev.map((conv) => (conv.id === chatId ? { ...conv, unreadCount: 0 } : conv)),
    );
  }, []);

  const value = useMemo(
    () => ({
      currentUser,
      conversations,
      searchQuery,
      setSearchQuery,
      filteredConversations,
      getMessages,
      getConversation,
      sendMessage,
      sendAttachment,
      markAsRead,
    }),
    [
      currentUser,
      conversations,
      searchQuery,
      filteredConversations,
      getMessages,
      getConversation,
      sendMessage,
      sendAttachment,
      markAsRead,
    ],
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

export const useChat = (): ChatContextValue => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within ChatProvider');
  }
  return context;
};
