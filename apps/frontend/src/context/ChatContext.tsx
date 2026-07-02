import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Conversation, Message, User } from '../types/chat';
import {
  getAttachmentPreviewLabel,
  getMessagePreview,
  resolveMessageType,
} from '../utils/message';
import {
  fetchConversationMessages,
  fetchConversations,
  mapApiMessageToChat,
  normalizePhone,
  sendMessageRest,
  sendAttachmentRest,
} from '../services/chatApi';
import { chatSocket, ChatMessageReceivedEvent, ChatMessageSentEvent } from '../services/chatSocket';
import { useAuth } from './AuthContext';

const MAX_ATTACHMENT_SIZE_BYTES = 16 * 1024 * 1024;

const AVATAR_COLORS = ['#128C7E', '#25D366', '#075E54', '#34B7F1', '#7C4DFF', '#FF6B6B'];

function pickAvatarColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function buildPlaceholderMessage(chatId: string, text: string): Message {
  return {
    id: `${chatId}-placeholder`,
    chatId,
    text,
    senderId: chatId,
    timestamp: new Date(0),
    type: 'text',
  };
}

interface ChatContextValue {
  currentUser: User;
  conversations: Conversation[];
  searchQuery: string;
  isLoading: boolean;
  error: string | null;
  setSearchQuery: (query: string) => void;
  filteredConversations: Conversation[];
  getMessages: (chatId: string) => Message[];
  getConversation: (chatId: string) => Conversation | undefined;
  loadChatHistory: (chatId: string) => Promise<void>;
  sendMessage: (chatId: string, text: string) => Promise<void>;
  sendAttachment: (chatId: string, file: File, caption?: string) => Promise<boolean>;
  markAsRead: (chatId: string) => void;
  refreshConversations: () => Promise<void>;
}

const ChatContext = createContext<ChatContextValue | null>(null);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { session } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messagesByChat, setMessagesByChat] = useState<Record<string, Message[]>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loadedChatsRef = useRef<Set<string>>(new Set());

  const currentUser = useMemo<User>(
    () => ({
      id: session?.userId ?? 'me',
      name: session?.name ?? 'Usuário',
      avatarColor: '#128C7E',
      status: 'Disponível',
    }),
    [session],
  );

  const appendMessage = useCallback((message: Message) => {
    setMessagesByChat((prev) => {
      const existing = prev[message.chatId] ?? [];
      if (existing.some((m) => m.id === message.id)) {
        return prev;
      }
      return {
        ...prev,
        [message.chatId]: [...existing, message],
      };
    });

    setConversations((prev) => {
      const chatId = message.chatId;
      const existingConv = prev.find((c) => c.id === chatId);
      const participant: User = existingConv?.participant ?? {
        id: chatId,
        name: chatId,
        avatarColor: pickAvatarColor(chatId),
      };

      const updated: Conversation = {
        id: chatId,
        participant,
        lastMessage: message,
        unreadCount: existingConv?.unreadCount ?? 0,
      };

      const others = prev.filter((c) => c.id !== chatId);
      return [updated, ...others].sort(
        (a, b) => b.lastMessage.timestamp.getTime() - a.lastMessage.timestamp.getTime(),
      );
    });
  }, []);

  const updateMessage = useCallback((chatId: string, messageId: string, patch: Partial<Message>) => {
    setMessagesByChat((prev) => {
      const list = prev[chatId] ?? [];
      const index = list.findIndex((m) => m.id === messageId);
      if (index < 0) return prev;

      const next = [...list];
      next[index] = { ...next[index], ...patch };
      return { ...prev, [chatId]: next };
    });

    setConversations((prev) =>
      prev
        .map((conv) => {
          if (conv.id !== chatId || conv.lastMessage.id !== messageId) return conv;
          return { ...conv, lastMessage: { ...conv.lastMessage, ...patch } };
        })
        .sort((a, b) => b.lastMessage.timestamp.getTime() - a.lastMessage.timestamp.getTime()),
    );
  }, []);

  const handleIncoming = useCallback(
    (event: ChatMessageReceivedEvent) => {
      const message: Message = {
        id: event.id,
        chatId: event.chatId,
        text: event.text,
        senderId: event.senderId,
        timestamp: new Date(event.timestamp),
        status: 'delivered',
        type: 'text',
      };

      setConversations((prev) => {
        const existing = prev.find((c) => c.id === event.chatId);
        const participant: User = existing?.participant ?? {
          id: event.chatId,
          name: event.fromName ?? event.chatId,
          avatarColor: pickAvatarColor(event.chatId),
        };

        const updated: Conversation = {
          id: event.chatId,
          participant,
          lastMessage: message,
          unreadCount: (existing?.unreadCount ?? 0) + 1,
        };

        const others = prev.filter((c) => c.id !== event.chatId);
        return [updated, ...others].sort(
          (a, b) => b.lastMessage.timestamp.getTime() - a.lastMessage.timestamp.getTime(),
        );
      });

      appendMessage(message);
    },
    [appendMessage],
  );

  const handleSent = useCallback((event: ChatMessageSentEvent) => {
    const serverMessage: Message = {
      id: event.id,
      chatId: event.chatId,
      text: event.text,
      senderId: event.senderId,
      timestamp: new Date(event.timestamp),
      status: 'sent',
      type: 'text',
    };

    setMessagesByChat((prev) => {
      const list = prev[event.chatId] ?? [];
      if (list.some((m) => m.id === event.id)) return prev;

      const pendingIndex = list.findIndex(
        (m) => m.status === 'pending' && m.senderId === event.senderId && m.text === event.text,
      );

      if (pendingIndex >= 0) {
        const next = [...list];
        next[pendingIndex] = serverMessage;
        return { ...prev, [event.chatId]: next };
      }

      return {
        ...prev,
        [event.chatId]: [...list, serverMessage],
      };
    });

    setConversations((prev) => {
      const existing = prev.find((c) => c.id === event.chatId);
      const participant: User = existing?.participant ?? {
        id: event.chatId,
        name: event.chatId,
        avatarColor: pickAvatarColor(event.chatId),
      };

      const updated: Conversation = {
        id: event.chatId,
        participant,
        lastMessage: serverMessage,
        unreadCount: existing?.unreadCount ?? 0,
      };

      const others = prev.filter((c) => c.id !== event.chatId);
      return [updated, ...others].sort(
        (a, b) => b.lastMessage.timestamp.getTime() - a.lastMessage.timestamp.getTime(),
      );
    });
  }, []);

  const refreshConversations = useCallback(async () => {
    if (!session) return;

    try {
      const { items } = await fetchConversations();
      const convs: Conversation[] = items.map((item) => {
        const lastMessage = mapApiMessageToChat(item.lastMessage, currentUser.id);
        return {
          id: item.chatId,
          participant: {
            id: item.chatId,
            name: item.participantName,
            avatarColor: pickAvatarColor(item.chatId),
          },
          lastMessage,
          unreadCount: 0,
        };
      });

      setConversations(convs);
      setMessagesByChat((prev) => {
        const next = { ...prev };
        for (const item of items) {
          const message = mapApiMessageToChat(item.lastMessage, currentUser.id);
          const existing = next[item.chatId] ?? [];
          if (!existing.some((m) => m.id === message.id)) {
            next[item.chatId] = [...existing, message];
          }
        }
        return next;
      });
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar conversas.';
      setError(message);
      setConversations([]);
    }
  }, [session, currentUser.id]);

  useEffect(() => {
    if (!session) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    async function bootstrap() {
      setIsLoading(true);
      chatSocket.connect();

      try {
        await refreshConversations();
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void bootstrap();

    const unsubReceived = chatSocket.onMessageReceived(handleIncoming);
    const unsubSent = chatSocket.onMessageSent(handleSent);

    return () => {
      cancelled = true;
      unsubReceived();
      unsubSent();
      chatSocket.disconnect();
    };
  }, [session, refreshConversations, handleIncoming, handleSent]);

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

  const loadChatHistory = useCallback(
    async (chatId: string) => {
      if (!session) return;

      setConversations((prev) => {
        if (prev.some((c) => c.id === chatId)) return prev;
        return [
          {
            id: chatId,
            participant: {
              id: chatId,
              name: chatId,
              avatarColor: pickAvatarColor(chatId),
            },
            lastMessage: buildPlaceholderMessage(chatId, 'Carregando…'),
            unreadCount: 0,
          },
          ...prev,
        ];
      });

      if (loadedChatsRef.current.has(chatId)) return;

      try {
        const response = await fetchConversationMessages(chatId, { limit: 50 });
        const messages = response.items.map((item) =>
          mapApiMessageToChat(item, currentUser.id),
        );

        if (messages.length > 0) {
          setMessagesByChat((prev) => ({
            ...prev,
            [chatId]: messages,
          }));

          const lastMessage = messages[messages.length - 1];
          setConversations((prev) => {
            const existing = prev.find((c) => c.id === chatId);
            const participant: User = existing?.participant ?? {
              id: chatId,
              name: chatId,
              avatarColor: pickAvatarColor(chatId),
            };

            const updated: Conversation = {
              id: chatId,
              participant,
              lastMessage,
              unreadCount: existing?.unreadCount ?? 0,
            };

            const others = prev.filter((c) => c.id !== chatId);
            return [updated, ...others].sort(
              (a, b) =>
                b.lastMessage.timestamp.getTime() - a.lastMessage.timestamp.getTime(),
            );
          });
        } else {
          setConversations((prev) => prev.filter((c) => c.id !== chatId));
        }

        loadedChatsRef.current.add(chatId);
      } catch {
        // Histórico indisponível — conversa ainda pode receber mensagens em tempo real
      }
    },
    [session, currentUser.id],
  );

  const sendMessage = useCallback(
    async (chatId: string, text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      const clientId = `client-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

      appendMessage({
        id: clientId,
        chatId,
        text: trimmed,
        senderId: currentUser.id,
        timestamp: new Date(),
        status: 'pending',
        type: 'text',
      });

      const socketResult = await chatSocket.sendMessage(chatId, trimmed);

      if (socketResult.ok) {
        if (socketResult.message) {
          updateMessage(chatId, clientId, {
            id: socketResult.message.id,
            status: 'sent',
            timestamp: new Date(socketResult.message.timestamp),
          });
        } else {
          updateMessage(chatId, clientId, { status: 'sent' });
        }
        return;
      }

      try {
        await sendMessageRest(chatId, trimmed);
        updateMessage(chatId, clientId, { status: 'sent' });
      } catch {
        updateMessage(chatId, clientId, { status: 'failed' });
      }
    },
    [appendMessage, currentUser.id, updateMessage],
  );

  const sendAttachment = useCallback(
    async (chatId: string, file: File, caption?: string): Promise<boolean> => {
      if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
        window.alert('Arquivo muito grande. O limite é 16 MB.');
        return false;
      }

      const type = resolveMessageType(file.type || 'application/octet-stream');
      const previewText = caption?.trim() || getAttachmentPreviewLabel(type, file.name);
      const clientId = `client-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const objectUrl = URL.createObjectURL(file);

      appendMessage({
        id: clientId,
        chatId,
        text: previewText,
        senderId: currentUser.id,
        timestamp: new Date(),
        status: 'pending',
        type,
        attachment: {
          name: file.name,
          mimeType: file.type || 'application/octet-stream',
          size: file.size,
          url: objectUrl,
        },
      });

      try {
        await sendAttachmentRest(chatId, file, caption);
        URL.revokeObjectURL(objectUrl);

        const response = await fetchConversationMessages(chatId, { limit: 50 });
        const messages = response.items.map((item) => mapApiMessageToChat(item, currentUser.id));

        setMessagesByChat((prev) => ({
          ...prev,
          [chatId]: messages,
        }));

        const lastMessage = messages[messages.length - 1];
        if (lastMessage) {
          setConversations((prev) => {
            const existing = prev.find((c) => c.id === chatId);
            const participant: User = existing?.participant ?? {
              id: chatId,
              name: chatId,
              avatarColor: pickAvatarColor(chatId),
            };

            const updated: Conversation = {
              id: chatId,
              participant,
              lastMessage,
              unreadCount: existing?.unreadCount ?? 0,
            };

            const others = prev.filter((c) => c.id !== chatId);
            return [updated, ...others].sort(
              (a, b) => b.lastMessage.timestamp.getTime() - a.lastMessage.timestamp.getTime(),
            );
          });
        }

        return true;
      } catch {
        updateMessage(chatId, clientId, { status: 'failed' });
        return false;
      }
    },
    [appendMessage, currentUser.id, updateMessage],
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
      isLoading,
      error,
      setSearchQuery,
      filteredConversations,
      getMessages,
      getConversation,
      loadChatHistory,
      sendMessage,
      sendAttachment,
      markAsRead,
      refreshConversations,
    }),
    [
      currentUser,
      conversations,
      searchQuery,
      isLoading,
      error,
      filteredConversations,
      getMessages,
      getConversation,
      loadChatHistory,
      sendMessage,
      sendAttachment,
      markAsRead,
      refreshConversations,
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
