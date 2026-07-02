import { IonContent, IonFooter, IonPage } from '@ionic/react';
import { useCallback, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import ChatHeader from '../components/ChatHeader';
import MessageBubble from '../components/MessageBubble';
import MessageInput from '../components/MessageInput';
import MessageListSkeleton from '../components/MessageListSkeleton';
import { useChat } from '../context/ChatContext';

const ChatDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const contentRef = useRef<HTMLIonContentElement>(null);
  const { getConversation, getMessages, sendMessage, sendAttachment, markAsRead, loadChatHistory, isChatLoading, currentUser } =
    useChat();

  const conversation = getConversation(id);
  const messages = getMessages(id);
  const isLoadingMessages = Boolean(id && isChatLoading(id) && messages.length === 0);
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

    markAsRead(id);

    void loadChatHistory(id).finally(() => {
      scrollToBottomWithRetries();
    });
  }, [id, markAsRead, loadChatHistory, scrollToBottomWithRetries]);

  useEffect(() => {
    if (!id || !conversation || isLoadingMessages) return;

    return scrollToBottomWithRetries();
  }, [id, conversation, isLoadingMessages, messages.length, lastMessageId, scrollToBottomWithRetries]);

  if (!conversation) {
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
    <IonPage>
      <ChatHeader user={conversation.participant} showBack />
      <IonContent ref={contentRef} className="wa-chat-bg">
        {isLoadingMessages ? (
          <MessageListSkeleton />
        ) : (
          <div className="wa-message-list">
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
    </IonPage>
  );
};

export default ChatDetail;
