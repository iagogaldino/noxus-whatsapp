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
  deleteConversation as deleteConversationApi,
  fetchConversationMessages,
  fetchConversations,
  forwardConversation as forwardConversationApi,
  formatGroupDisplayName,
  isGroupJid,
  mapApiMessageToChat,
  normalizePhone,
  sendMessageRest,
  sendAttachmentRest,
} from '../services/chatApi';
import { chatSocket, ChatMessageReceivedEvent, ChatMessageSentEvent } from '../services/chatSocket';
import { useAuth } from './AuthContext';
import { resolveRouteChatId, sameChatId } from '../utils/chatRoute';

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

function messageFromIncomingEvent(event: ChatMessageReceivedEvent): Message {
  return {
    id: event.id,
    chatId: event.chatId,
    text: event.text,
    senderId: event.senderId,
    senderName: event.senderName,
    timestamp: new Date(event.timestamp),
    status: 'delivered',
    type: event.type ?? 'text',
    reply: event.reply,
    attachment: event.attachment
      ? {
          name: event.attachment.name,
          mimeType: event.attachment.mimeType,
          size: event.attachment.size,
          url: '',
        }
      : undefined,
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
  isChatLoading: (chatId: string) => boolean;
  isChatHistoryLoaded: (chatId: string) => boolean;
  loadChatHistory: (chatId: string) => Promise<void>;
  startConversation: (chatId: string, participantName: string) => void;
  sendMessage: (chatId: string, text: string) => Promise<void>;
  sendAttachment: (chatId: string, file: File, caption?: string) => Promise<boolean>;
  markAsRead: (chatId: string) => void;
  forwardConversation: (chatId: string, sectorId: string) => Promise<{ success: boolean; error?: string }>;
  deleteConversation: (chatId: string) => Promise<{ success: boolean; error?: string }>;
  refreshConversations: () => Promise<void>;
}

const ChatContext = createContext<ChatContextValue | null>(null);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { session, isAdmin } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messagesByChat, setMessagesByChat] = useState<Record<string, Message[]>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingChatIds, setLoadingChatIds] = useState<Set<string>>(() => new Set());
  const loadedChatsRef = useRef<Set<string>>(new Set());
  const draftChatIdsRef = useRef<Set<string>>(new Set());
  const conversationsRef = useRef<Conversation[]>([]);

  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  const currentUser = useMemo<User>(
    () => ({
      id: session?.userId ?? 'me',
      name: session?.name ?? 'Usuário',
      avatarColor: '#128C7E',
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
        isGroup: existingConv?.isGroup,
        participant,
        lastMessage: message,
        unreadCount: existingConv?.unreadCount ?? 0,
        assignedSector: existingConv?.assignedSector ?? null,
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

  const refreshConversations = useCallback(async () => {
    if (!session) return;

    try {
      const { items } = await fetchConversations();
      const convs: Conversation[] = items.map((item) => {
        const isGroup = item.isGroup ?? false;
        const lastMessage = mapApiMessageToChat(item.lastMessage, currentUser.id, {
          chatId: item.chatId,
          isGroup,
        });
        return {
          id: item.chatId,
          isGroup,
          participant: {
            id: item.chatId,
            name: item.participantName,
            avatarColor: pickAvatarColor(item.chatId),
          },
          lastMessage,
          unreadCount: 0,
          assignedSector: item.assignedSector ?? null,
        };
      });

      setConversations(convs);
      setMessagesByChat((prev) => {
        const next = { ...prev };
        for (const item of items) {
          const isGroup = item.isGroup ?? false;
          const message = mapApiMessageToChat(item.lastMessage, currentUser.id, {
            chatId: item.chatId,
            isGroup,
          });
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

  const handleIncoming = useCallback(
    (event: ChatMessageReceivedEvent) => {
      const message = messageFromIncomingEvent(event);

      setConversations((prev) => {
        const existing = prev.find((c) => c.id === event.chatId);
        const participant: User = existing?.participant ?? {
          id: event.chatId,
          name: event.isGroup
            ? formatGroupDisplayName(event.chatId)
            : (event.fromName ?? event.chatId),
          avatarColor: pickAvatarColor(event.chatId),
        };

        const updated: Conversation = {
          id: event.chatId,
          isGroup: event.isGroup ?? existing?.isGroup,
          participant,
          lastMessage: message,
          unreadCount: (existing?.unreadCount ?? 0) + 1,
          assignedSector: existing?.assignedSector ?? null,
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

  const handleEmployeeIncoming = useCallback(
    (event: ChatMessageReceivedEvent) => {
      const message = messageFromIncomingEvent(event);

      if (conversationsRef.current.some((conversation) => conversation.id === event.chatId)) {
        appendMessage(message);
      }

      void refreshConversations();
    },
    [appendMessage, refreshConversations],
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
        assignedSector: existing?.assignedSector ?? null,
      };

      const others = prev.filter((c) => c.id !== event.chatId);
      return [updated, ...others].sort(
        (a, b) => b.lastMessage.timestamp.getTime() - a.lastMessage.timestamp.getTime(),
      );
    });
  }, []);

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

    const unsubReceived = chatSocket.onMessageReceived((event) => {
      if (isAdmin) {
        handleIncoming(event);
        return;
      }
      handleEmployeeIncoming(event);
    });
    const unsubSent = chatSocket.onMessageSent(handleSent);
    const unsubForwarded = chatSocket.onConversationForwarded(() => {
      void refreshConversations();
    });

    return () => {
      cancelled = true;
      unsubReceived();
      unsubSent();
      unsubForwarded();
      chatSocket.disconnect();
    };
  }, [session, isAdmin, refreshConversations, handleIncoming, handleEmployeeIncoming, handleSent]);

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
    (chatId: string) => {
      const normalizedId = resolveRouteChatId(chatId) ?? chatId;
      if (messagesByChat[normalizedId]) return messagesByChat[normalizedId];
      const matched = Object.keys(messagesByChat).find((key) => sameChatId(key, chatId));
      return matched ? messagesByChat[matched] : [];
    },
    [messagesByChat],
  );

  const getConversation = useCallback(
    (chatId: string) => conversations.find((c) => sameChatId(c.id, chatId)),
    [conversations],
  );

  const isChatLoading = useCallback(
    (chatId: string) => loadingChatIds.has(chatId),
    [loadingChatIds],
  );

  const isChatHistoryLoaded = useCallback((chatId: string) => loadedChatsRef.current.has(chatId), []);

  const setChatLoading = useCallback((chatId: string, loading: boolean) => {
    setLoadingChatIds((prev) => {
      const next = new Set(prev);
      if (loading) {
        next.add(chatId);
      } else {
        next.delete(chatId);
      }
      return next;
    });
  }, []);

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
            lastMessage: buildPlaceholderMessage(chatId, ''),
            unreadCount: 0,
          },
          ...prev,
        ];
      });

      if (loadedChatsRef.current.has(chatId)) return;

      setChatLoading(chatId, true);

      try {
        const response = await fetchConversationMessages(chatId, { limit: 50 });
        const conversationMeta = conversationsRef.current.find((c) => c.id === chatId);
        const isGroup =
          (conversationMeta?.isGroup ?? isGroupJid(chatId)) ||
          response.items.some((item) => item.isGroup);
        const messages = response.items.map((item) =>
          mapApiMessageToChat(item, currentUser.id, {
            chatId,
            isGroup: isGroup || item.isGroup,
          }),
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
              name: isGroup ? formatGroupDisplayName(chatId) : chatId,
              avatarColor: pickAvatarColor(chatId),
            };

            const updated: Conversation = {
              id: chatId,
              isGroup,
              participant,
              lastMessage,
              unreadCount: existing?.unreadCount ?? 0,
              assignedSector: existing?.assignedSector ?? null,
            };

            const others = prev.filter((c) => c.id !== chatId);
            return [updated, ...others].sort(
              (a, b) =>
                b.lastMessage.timestamp.getTime() - a.lastMessage.timestamp.getTime(),
            );
          });
        } else {
          setMessagesByChat((prev) => ({
            ...prev,
            [chatId]: [],
          }));

          const existing = conversationsRef.current.find((c) => sameChatId(c.id, chatId));
          const isPlaceholder =
            existing?.lastMessage.id === `${existing?.id ?? chatId}-placeholder`;

          if (isPlaceholder && !draftChatIdsRef.current.has(chatId)) {
            setConversations((prev) => prev.filter((c) => !sameChatId(c.id, chatId)));
          }
        }

        loadedChatsRef.current.add(chatId);
      } catch {
        // Histórico indisponível — conversa ainda pode receber mensagens em tempo real
      } finally {
        setChatLoading(chatId, false);
      }
    },
    [session, currentUser.id, setChatLoading],
  );

  const startConversation = useCallback((chatId: string, participantName: string) => {
    const normalizedId = normalizePhone(chatId) || chatId.trim();
    if (!normalizedId) return;

    draftChatIdsRef.current.add(normalizedId);
    loadedChatsRef.current.delete(normalizedId);

    setConversations((prev) => {
      const existing = prev.find((conversation) => conversation.id === normalizedId);
      if (existing) {
        return prev.map((conversation) =>
          conversation.id === normalizedId
            ? {
                ...conversation,
                participant: {
                  ...conversation.participant,
                  name: participantName || conversation.participant.name,
                },
              }
            : conversation,
        );
      }

      return [
        {
          id: normalizedId,
          participant: {
            id: normalizedId,
            name: participantName || normalizedId,
            avatarColor: pickAvatarColor(normalizedId),
          },
          lastMessage: buildPlaceholderMessage(normalizedId, ''),
          unreadCount: 0,
        },
        ...prev,
      ];
    });

    setMessagesByChat((prev) => ({
      ...prev,
      [normalizedId]: prev[normalizedId] ?? [],
    }));
  }, []);

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
        draftChatIdsRef.current.delete(chatId);
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
        draftChatIdsRef.current.delete(chatId);
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
        draftChatIdsRef.current.delete(chatId);
        URL.revokeObjectURL(objectUrl);

        const response = await fetchConversationMessages(chatId, { limit: 50 });
        const existingConv = conversationsRef.current.find((c) => c.id === chatId);
        const isGroup = existingConv?.isGroup ?? isGroupJid(chatId);
        const messages = response.items.map((item) =>
          mapApiMessageToChat(item, currentUser.id, { chatId, isGroup }),
        );

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
              name: isGroup ? formatGroupDisplayName(chatId) : chatId,
              avatarColor: pickAvatarColor(chatId),
            };

            const updated: Conversation = {
              id: chatId,
              isGroup,
              participant,
              lastMessage,
              unreadCount: existing?.unreadCount ?? 0,
              assignedSector: existing?.assignedSector ?? null,
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
      prev.map((conv) => (sameChatId(conv.id, chatId) ? { ...conv, unreadCount: 0 } : conv)),
    );
  }, []);

  const forwardConversation = useCallback(
    async (chatId: string, sectorId: string) => {
      try {
        const result = await forwardConversationApi(chatId, sectorId);
        setConversations((prev) =>
          prev.map((conv) =>
            conv.id === chatId ? { ...conv, assignedSector: result.assignedSector } : conv,
          ),
        );
        await refreshConversations();
        return { success: true };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : 'Falha ao encaminhar conversa.',
        };
      }
    },
    [refreshConversations],
  );

  const deleteConversation = useCallback(async (chatId: string) => {
    try {
      await deleteConversationApi(chatId);

      setConversations((prev) => prev.filter((conv) => conv.id !== chatId));
      setMessagesByChat((prev) => {
        const next = { ...prev };
        delete next[chatId];
        return next;
      });
      loadedChatsRef.current.delete(chatId);
      draftChatIdsRef.current.delete(chatId);

      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Falha ao remover conversa.',
      };
    }
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
      isChatLoading,
      isChatHistoryLoaded,
      loadChatHistory,
      startConversation,
      sendMessage,
      sendAttachment,
      markAsRead,
      forwardConversation,
      deleteConversation,
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
      isChatLoading,
      isChatHistoryLoaded,
      loadChatHistory,
      startConversation,
      sendMessage,
      sendAttachment,
      markAsRead,
      forwardConversation,
      deleteConversation,
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
