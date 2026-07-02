import { IonIcon } from '@ionic/react';
import { checkmarkDoneOutline } from 'ionicons/icons';
import { Message } from '../types/chat';
import { formatMessageTime } from '../utils/format';

interface MessageBubbleProps {
  message: Message;
  isSent: boolean;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isSent }) => (
  <div className={`wa-message-row ${isSent ? 'wa-message-row--sent' : 'wa-message-row--received'}`}>
    <div className={`wa-bubble ${isSent ? 'wa-bubble--sent' : 'wa-bubble--received'}`}>
      <div className="wa-bubble__text">{message.text}</div>
      <div className="wa-bubble__meta">
        <span className="wa-bubble__time">{formatMessageTime(message.timestamp)}</span>
        {isSent && message.status && (
          <IonIcon
            icon={checkmarkDoneOutline}
            className="wa-bubble__status"
            style={{ color: message.status === 'read' ? '#53bdeb' : 'var(--wa-text-secondary)' }}
          />
        )}
      </div>
    </div>
  </div>
);

export default MessageBubble;
