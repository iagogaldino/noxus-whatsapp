import { IonAlert, IonContent, IonFooter, IonPage } from '@ionic/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import ChatHeader from '../components/ChatHeader';
import ForwardConversationModal from '../components/ForwardConversationModal';
import MessageBubble from '../components/MessageBubble';
import MessageInput from '../components/MessageInput';
import MessageListSkeleton from '../components/MessageListSkeleton';
import { useChat } from '../context/ChatContext';
import { resolveRouteChatId } from '../utils/chatRoute';
import { useAppNavigate } from '../utils/navigation';

const ChatDetail: React.FC = () => {
  const { id: routeId } = useParams<{ id: string }>();
  const chatId = resolveRouteChatId(routeId);
  const { replace } = useAppNavigate();
  const contentRef = useRef<HTMLIonContentElement>(null);
  const prevChatIdRef = useRef(chatId);
  const {
    getConversation,
    getMessages,
    sendMessage,
    sendAttachment,
    markAsRead,
    loadChatHistory,
    isChatHistoryLoaded,
    forwardConversation,
    deleteConversation,
    currentUser,
  } = useChat();

  const [forwardModalOpen, setForwardModalOpen] = useState(false);
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);
  const [historyReadyFor, setHistoryReadyFor] = useState<string | undefined>(chatId);

  const justSwitchedChat = prevChatIdRef.current !== chatId;
  if (justSwitchedChat) {
    prevChatIdRef.current = chatId;
  }

  const conversation = chatId ? getConversation(chatId) : undefined;
  const messages = chatId
    ? getMessages(chatId).filter((message) => message.chatId === conversation?.id || message.chatId === chatId)
    : [];
  const showMessageSkeleton =
    Boolean(chatId) && (justSwitchedChat || historyReadyFor !== chatId);
  const lastMessageId = messages[messages.length - 1]?.id;
  const resolvedChatId = conversation?.id ?? chatId;

  const scrollToBottom = useCallback(async () => {
    const content = contentRef.current;
    if (!content) return;

    await content.scrollToBottom(0);
  }, []);

  const scrollToBottomWithRetries = useCallback(() => {
    const timeouts: ReturnType<typeof setTimeout>[] = [];

    const schedule = (delay: number) => {
      timeouts.push(
        setTimeout(() => {
          void scrollToBottom();
        }, delay),
      );
    };

    void scrollToBottom();
    schedule(50);
    schedule(150);
    schedule(400);

    return () => {
      for (const timeout of timeouts) {
        clearTimeout(timeout);
      }
    };
  }, [scrollToBottom]);

  const handleDelete = useCallback(async () => {
    if (!resolvedChatId) return;

    const result = await deleteConversation(resolvedChatId);
    if (!result.success) {
      window.alert(result.error ?? 'Falha ao remover conversa.');
      return;
    }

    setDeleteAlertOpen(false);
    replace('/');
  }, [deleteConversation, replace, resolvedChatId]);

  useEffect(() => {
    if (!chatId) return;

    let cancelled = false;
    markAsRead(chatId);

    if (isChatHistoryLoaded(chatId)) {
      setHistoryReadyFor(chatId);
      return scrollToBottomWithRetries();
    }

    void loadChatHistory(chatId).finally(() => {
      if (!cancelled) {
        setHistoryReadyFor(chatId);
        scrollToBottomWithRetries();
      }
    });

    return () => {
      cancelled = true;
    };
  }, [chatId, markAsRead, loadChatHistory, isChatHistoryLoaded, scrollToBottomWithRetries]);

  useEffect(() => {
    if (!chatId || !conversation || showMessageSkeleton) return;

    return scrollToBottomWithRetries();
  }, [chatId, conversation, showMessageSkeleton, messages.length, lastMessageId, scrollToBottomWithRetries]);

  const deleteAlert = (
    <IonAlert
      isOpen={deleteAlertOpen}
      onDidDismiss={() => setDeleteAlertOpen(false)}
      header="Remover conversa"
      message={
        conversation
          ? `Deseja remover a conversa com ${conversation.participant.name}? O histórico local será apagado.`
          : 'Deseja remover esta conversa? O histórico local será apagado.'
      }
      buttons={[
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Remover', role: 'destructive', handler: () => void handleDelete() },
      ]}
    />
  );

  if (!chatId) {
    return (
      <IonPage>
        <IonContent>
          <div className="wa-empty-state">
            <p>Conversa não encontrada.</p>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  if (!conversation) {
    return (
      <IonPage>
        <ChatHeader
          user={{ id: chatId, name: chatId }}
          showBack
          onDelete={() => setDeleteAlertOpen(true)}
        />
        <IonContent>
          <div className="wa-empty-state">
            <p>Conversa não encontrada.</p>
          </div>
        </IonContent>
        {deleteAlert}
      </IonPage>
    );
  }

  return (
    <IonPage key={chatId}>
      <ChatHeader
        user={conversation.participant}
        isGroup={conversation.isGroup}
        showBack
        onForward={() => setForwardModalOpen(true)}
        onDelete={() => setDeleteAlertOpen(true)}
      />
      <IonContent ref={contentRef} className="wa-chat-bg">
        {showMessageSkeleton ? (
          <MessageListSkeleton />
        ) : (
          <div key={chatId} className="wa-message-list">
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                isSent={message.senderId === currentUser.id}
                showSenderName={
                  Boolean(conversation.isGroup) && message.senderId !== currentUser.id
                }
              />
            ))}
          </div>
        )}
      </IonContent>
      <IonFooter className="wa-footer">
        <MessageInput
          onSend={(text) => void sendMessage(conversation.id, text)}
          onSendAttachment={(file, caption) => void sendAttachment(conversation.id, file, caption)}
        />
      </IonFooter>

      <ForwardConversationModal
        isOpen={forwardModalOpen}
        chatName={conversation.participant.name}
        currentSectorId={conversation.assignedSector?.id ?? null}
        onClose={() => setForwardModalOpen(false)}
        onSelectSector={(sectorId) => forwardConversation(conversation.id, sectorId)}
      />

      {deleteAlert}
    </IonPage>
  );
};

export default ChatDetail;
