import { IonContent, IonFooter, IonPage } from '@ionic/react';
import { useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import ChatHeader from '../components/ChatHeader';
import MessageBubble from '../components/MessageBubble';
import MessageInput from '../components/MessageInput';
import { useChat } from '../context/ChatContext';

const ChatDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const contentRef = useRef<HTMLIonContentElement>(null);
  const { getConversation, getMessages, sendMessage, sendAttachment, markAsRead, loadChatHistory, currentUser } =
    useChat();

  const conversation = getConversation(id);
  const messages = getMessages(id);

  useEffect(() => {
    if (id) {
      void loadChatHistory(id);
      markAsRead(id);
    }
  }, [id, markAsRead, loadChatHistory]);

  useEffect(() => {
    contentRef.current?.scrollToBottom(300);
  }, [messages.length]);

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
        <div className="wa-message-list">
          {messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              isSent={message.senderId === currentUser.id}
            />
          ))}
        </div>
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
