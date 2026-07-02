import { IonIcon } from '@ionic/react';
import { documentOutline } from 'ionicons/icons';
import { MessageAttachment } from '../types/chat';
import { formatFileSize } from '../utils/message';
import { useAuthenticatedMediaUrl } from '../hooks/useAuthenticatedMediaUrl';

interface FileMessageContentProps {
  messageId: string;
  attachment: MessageAttachment;
}

const FileMessageContent: React.FC<FileMessageContentProps> = ({ messageId, attachment }) => {
  const mediaSrc = useAuthenticatedMediaUrl(messageId, attachment.url);

  if (!mediaSrc) {
    return (
      <div className="wa-bubble__file-card wa-bubble__file-card--loading" aria-busy="true">
        <IonIcon icon={documentOutline} className="wa-bubble__file-icon" />
        <div className="wa-bubble__file-info">
          <span className="wa-bubble__file-name">{attachment.name}</span>
          <span className="wa-bubble__file-size">{formatFileSize(attachment.size)}</span>
        </div>
      </div>
    );
  }

  return (
    <a
      href={mediaSrc}
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
  );
};

export default FileMessageContent;
