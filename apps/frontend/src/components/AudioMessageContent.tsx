import { MessageAttachment } from '../types/chat';
import { useAuthenticatedMediaUrl } from '../hooks/useAuthenticatedMediaUrl';

interface AudioMessageContentProps {
  messageId: string;
  attachment: MessageAttachment;
}

const AudioMessageContent: React.FC<AudioMessageContentProps> = ({ messageId, attachment }) => {
  const mediaSrc = useAuthenticatedMediaUrl(messageId, attachment.url);
  const label = /^voice-note\./i.test(attachment.name) ? 'Nota de voz' : 'Áudio';

  return (
    <div className="wa-bubble__audio" aria-label={label}>
      {mediaSrc ? (
        <audio controls preload="metadata" className="wa-bubble__audio-player" src={mediaSrc}>
          <track kind="captions" />
        </audio>
      ) : (
        <div className="wa-bubble__audio-placeholder" aria-busy="true">
          <span className="wa-bubble__audio-placeholder-icon">🎤</span>
          <span className="wa-bubble__audio-placeholder-text">Carregando {label.toLowerCase()}...</span>
        </div>
      )}
    </div>
  );
};

export default AudioMessageContent;
