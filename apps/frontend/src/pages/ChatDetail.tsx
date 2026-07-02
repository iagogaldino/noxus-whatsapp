import { IonContent, IonFooter, IonPage } from '@ionic/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import ChatHeader from '../components/ChatHeader';
import ForwardConversationModal from '../components/ForwardConversationModal';
import MessageBubble from '../components/MessageBubble';
import MessageInput from '../components/MessageInput';
import MessageListSkeleton from '../components/MessageListSkeleton';
import { useChat } from '../context/ChatContext';

const ChatDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const contentRef = useRef<HTMLIonContentElement>(null);
  const prevChatIdRef = useRef(id);
  const {
    getConversation,
    getMessages,
    sendMessage,
    sendAttachment,
    markAsRead,
    loadChatHistory,
    isChatHistoryLoaded,
    forwardConversation,
    currentUser,
  } = useChat();

  const [forwardModalOpen, setForwardModalOpen] = useState(false);
  const [historyReadyFor, setHistoryReadyFor] = useState<string | undefined>(id);

  const justSwitchedChat = prevChatIdRef.current !== id;
  if (justSwitchedChat) {
    prevChatIdRef.current = id;
  }

  const conversation = id ? getConversation(id) : undefined;
  const messages = id
    ? getMessages(id).filter((message) => message.chatId === id)
    : [];
  const showMessageSkeleton =
    Boolean(id) && (justSwitchedChat || historyReadyFor !== id);
  const lastMessageId = messages[messages.length - 1]?.id;

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

  useEffect(() => {
    if (!id) return;

    let cancelled = false;
    markAsRead(id);

    if (isChatHistoryLoaded(id)) {
      setHistoryReadyFor(id);
      return scrollToBottomWithRetries();
    }

    void loadChatHistory(id).finally(() => {
      if (!cancelled) {
        setHistoryReadyFor(id);
        scrollToBottomWithRetries();
      }
    });

    return () => {
      cancelled = true;
    };
  }, [id, markAsRead, loadChatHistory, isChatHistoryLoaded, scrollToBottomWithRetries]);

  useEffect(() => {
    if (!id || !conversation || showMessageSkeleton) return;

    return scrollToBottomWithRetries();
  }, [id, conversation, showMessageSkeleton, messages.length, lastMessageId, scrollToBottomWithRetries]);

  if (!id || !conversation) {
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

  return (
    <IonPage key={id}>
      <ChatHeader
        user={conversation.participant}
        showBack
        onForward={() => setForwardModalOpen(true)}
      />
      <IonContent ref={contentRef} className="wa-chat-bg">
        {showMessageSkeleton ? (
          <MessageListSkeleton />
        ) : (
          <div key={id} className="wa-message-list">
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                isSent={message.senderId === currentUser.id}
              />
            ))}
          </div>
        )}
      </IonContent>
      <IonFooter className="wa-footer">
        <MessageInput
          onSend={(text) => void sendMessage(id, text)}
          onSendAttachment={(file, caption) => void sendAttachment(id, file, caption)}
        />
      </IonFooter>

      <ForwardConversationModal
        isOpen={forwardModalOpen}
        chatName={conversation.participant.name}
        currentSectorId={conversation.assignedSector?.id ?? null}
        onClose={() => setForwardModalOpen(false)}
        onSelectSector={(sectorId) => forwardConversation(id, sectorId)}
      />
    </IonPage>
  );
};

export default ChatDetail;
