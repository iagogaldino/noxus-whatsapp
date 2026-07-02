import { IonIcon } from '@ionic/react';
import { alertCircleOutline, checkmarkDoneOutline, timeOutline } from 'ionicons/icons';
import { Message } from '../types/chat';
import { formatMessageTime } from '../utils/format';
import { getMessageType, isMediaPlaceholderText } from '../utils/message';
import { FormattedMessageText } from '../utils/whatsappText';
import ImageMessageContent from './ImageMessageContent';
import FileMessageContent from './FileMessageContent';
import AudioMessageContent from './AudioMessageContent';

interface MessageBubbleProps {
  message: Message;
  isSent: boolean;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isSent }) => {
  const type = getMessageType(message);
  const attachment = message.attachment;
  const hasCaption =
    type !== 'text' && attachment && !isMediaPlaceholderText(message.text);

  return (
    <div className={`wa-message-row ${isSent ? 'wa-message-row--sent' : 'wa-message-row--received'}`}>
      <div
        className={`wa-bubble ${isSent ? 'wa-bubble--sent' : 'wa-bubble--received'} ${
          type !== 'text' ? 'wa-bubble--media' : ''
        } ${type === 'audio' ? 'wa-bubble--audio' : ''}`}
      >
        {type === 'image' && attachment && (
          <ImageMessageContent messageId={message.id} attachment={attachment} />
        )}

        {type === 'file' && attachment && (
          <FileMessageContent messageId={message.id} attachment={attachment} />
        )}

        {type === 'audio' && attachment && (
          <AudioMessageContent messageId={message.id} attachment={attachment} isSent={isSent} />
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
