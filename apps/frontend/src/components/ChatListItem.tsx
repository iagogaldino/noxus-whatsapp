import { IonIcon } from '@ionic/react';
import { checkmarkDoneOutline } from 'ionicons/icons';
import { Conversation } from '../types/chat';
import { formatChatTime } from '../utils/format';
import { getMessagePreview } from '../utils/message';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import Avatar from './Avatar';

interface ChatListItemProps {
  conversation: Conversation;
  isActive?: boolean;
  onClick: () => void;
}

function buildPreview(conversation: Conversation, isSent: boolean, previewText: string): string {
  if (!previewText) return '';
  if (isSent) return previewText;
  if (conversation.isGroup && conversation.lastMessage.senderName) {
    return `${conversation.lastMessage.senderName}: ${previewText}`;
  }
  return previewText;
}

const ChatListItem: React.FC<ChatListItemProps> = ({ conversation, isActive, onClick }) => {
  const { currentUser } = useChat();
  const { isAdmin } = useAuth();
  const { participant, lastMessage, unreadCount, assignedSector } = conversation;
  const isSent = lastMessage.senderId === currentUser.id;
  const previewText = getMessagePreview(lastMessage);
  const preview = buildPreview(conversation, isSent, previewText);
  const hasUnread = unreadCount > 0;
  const isRead = lastMessage.status === 'read';

  return (
    <button
      type="button"
      className={`wa-chat-item ${isActive ? 'wa-chat-item--active' : ''}`}
      onClick={onClick}
    >
      <div className={`wa-chat-item__avatar ${isActive ? 'wa-chat-item__avatar--active' : ''}`}>
        <Avatar user={participant} />
      </div>

      <div className="wa-chat-item__content">
        <div className="wa-chat-item__header">
          <span className="wa-chat-item__name">{participant.name}</span>
          <span className={`wa-chat-item__time ${hasUnread ? 'wa-chat-item__time--unread' : ''}`}>
            {formatChatTime(lastMessage.timestamp)}
          </span>
        </div>

        <div className="wa-chat-item__footer">
          <span
            className={`wa-chat-item__preview ${hasUnread ? 'wa-chat-item__preview--unread' : ''}`}
          >
            {isSent && (
              <IonIcon
                icon={checkmarkDoneOutline}
                className={`wa-chat-item__ticks ${isRead ? 'wa-chat-item__ticks--read' : ''}`}
                aria-hidden="true"
              />
            )}
            {isSent && preview ? <span className="wa-chat-item__you">Você:&nbsp;</span> : null}
            {preview}
          </span>

          <div className="wa-chat-item__meta">
            {isAdmin && (
              <span className="wa-sector-badge">{assignedSector?.name ?? 'Geral'}</span>
            )}
            {hasUnread && <span className="wa-unread-badge">{unreadCount}</span>}
          </div>
        </div>
      </div>
    </button>
  );
};

export default ChatListItem;
