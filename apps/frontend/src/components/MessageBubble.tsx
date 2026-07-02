import { IonIcon } from '@ionic/react';
import { alertCircleOutline, checkmarkDoneOutline, documentOutline, timeOutline } from 'ionicons/icons';
import { Message } from '../types/chat';
import { formatMessageTime } from '../utils/format';
import { formatFileSize, getMessageType } from '../utils/message';
import { FormattedMessageText } from '../utils/whatsappText';

interface MessageBubbleProps {
  message: Message;
  isSent: boolean;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isSent }) => {
  const type = getMessageType(message);
  const attachment = message.attachment;
  const hasCaption =
    type !== 'text' &&
    attachment &&
    message.text !== `📷 Foto` &&
    !message.text.startsWith('📎 ');

  const handleImageClick = () => {
    if (attachment?.url) {
      window.open(attachment.url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className={`wa-message-row ${isSent ? 'wa-message-row--sent' : 'wa-message-row--received'}`}>
      <div
        className={`wa-bubble ${isSent ? 'wa-bubble--sent' : 'wa-bubble--received'} ${
          type !== 'text' ? 'wa-bubble--media' : ''
        }`}
      >
        {type === 'image' && attachment && (
          <button
            type="button"
            className="wa-bubble__image-btn"
            onClick={handleImageClick}
            aria-label={`Abrir imagem ${attachment.name}`}
          >
            <img src={attachment.url} alt={attachment.name} className="wa-bubble__image" />
          </button>
        )}

        {type === 'file' && attachment && (
          <a
            href={attachment.url}
            download={attachment.name}
            className="wa-bubble__file-card"
            target="_blank"
            rel="noopener noreferrer"
          >
            <IonIcon icon={documentOutline} className="wa-bubble__file-icon" />
            <div className="wa-bubble__file-info">
              <span className="wa-bubble__file-name">{attachment.name}</span>
              <span className="wa-bubble__file-size">{formatFileSize(attachment.size)}</span>
            </div>
          </a>
        )}

        {type === 'text' && <FormattedMessageText text={message.text} className="wa-bubble__text" />}

        {hasCaption && <FormattedMessageText text={message.text} className="wa-bubble__caption" />}

        <div className="wa-bubble__meta">
          <span className="wa-bubble__time">{formatMessageTime(message.timestamp)}</span>
          {isSent && message.status === 'failed' && (
            <IonIcon
              icon={alertCircleOutline}
              className="wa-bubble__status wa-bubble__status--failed"
              title="Falha ao enviar"
            />
          )}
          {isSent && message.status === 'pending' && (
            <IonIcon icon={timeOutline} className="wa-bubble__status wa-bubble__status--pending" />
          )}
          {isSent &&
            message.status &&
            (message.status === 'sent' || message.status === 'delivered' || message.status === 'read') && (
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
};

export default MessageBubble;
