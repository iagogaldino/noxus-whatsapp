import { IonItem } from '@ionic/react';
import { Conversation } from '../types/chat';
import { formatChatTime } from '../utils/format';
import Avatar from './Avatar';

interface ChatListItemProps {
  conversation: Conversation;
  isActive?: boolean;
  onClick: () => void;
}

const ChatListItem: React.FC<ChatListItemProps> = ({ conversation, isActive, onClick }) => {
  const { participant, lastMessage, unreadCount } = conversation;
  const isSent = lastMessage.senderId === 'me';
  const preview = isSent ? `Você: ${lastMessage.text}` : lastMessage.text;

  return (
    <IonItem
      className={`wa-chat-item ${isActive ? 'wa-chat-item--active' : ''}`}
      button
      detail={false}
      onClick={onClick}
      lines="full"
    >
      <div style={{ display: 'flex', alignItems: 'center', width: '100%', padding: '8px 0' }}>
        <Avatar user={participant} />
        <div className="wa-chat-item__content">
          <div className="wa-chat-item__row">
            <span className="wa-chat-item__name">{participant.name}</span>
            <span className="wa-chat-item__time">{formatChatTime(lastMessage.timestamp)}</span>
          </div>
          <div className="wa-chat-item__row">
            <span className={`wa-chat-item__preview ${unreadCount > 0 ? 'wa-chat-item__preview--unread' : ''}`}>
              {preview}
            </span>
            {unreadCount > 0 && <span className="wa-unread-badge">{unreadCount}</span>}
          </div>
        </div>
      </div>
    </IonItem>
  );
};

export default ChatListItem;
