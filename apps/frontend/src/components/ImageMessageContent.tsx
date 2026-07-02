import { useState } from 'react';
import { MessageAttachment } from '../types/chat';
import { useAuthenticatedMediaUrl } from '../hooks/useAuthenticatedMediaUrl';
import ImagePreview from './ImagePreview';

interface ImageMessageContentProps {
  messageId: string;
  attachment: MessageAttachment;
}

const ImageMessageContent: React.FC<ImageMessageContentProps> = ({ messageId, attachment }) => {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const mediaSrc = useAuthenticatedMediaUrl(messageId, attachment.url);

  return (
    <>
      <button
        type="button"
        className="wa-bubble__image-btn"
        onClick={() => mediaSrc && setIsPreviewOpen(true)}
        disabled={!mediaSrc}
        aria-label={`Abrir imagem ${attachment.name}`}
      >
        {mediaSrc ? (
          <img src={mediaSrc} alt={attachment.name} className="wa-bubble__image" />
        ) : (
          <div className="wa-bubble__image-placeholder" aria-hidden="true">
            <span className="wa-bubble__image-placeholder-icon">📷</span>
          </div>
        )}
      </button>

      {mediaSrc && (
        <ImagePreview
          src={mediaSrc}
          alt={attachment.name}
          isOpen={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
        />
      )}
    </>
  );
};

export default ImageMessageContent;
