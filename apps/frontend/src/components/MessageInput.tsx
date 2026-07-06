import { IonIcon } from '@ionic/react';
import { attachOutline, closeOutline, micOutline, send } from 'ionicons/icons';
import { useRef, useState, KeyboardEvent, ChangeEvent } from 'react';
import type { MessageReplyTarget } from '../types/chat';
import { formatReplyDraftPreview } from '../utils/reply';

interface MessageInputProps {
  onSend: (text: string, replyTo?: MessageReplyTarget) => void;
  onSendAttachment: (file: File, caption?: string) => void;
  replyTo?: MessageReplyTarget | null;
  onCancelReply?: () => void;
}

const FILE_ACCEPT = 'image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip';

const MessageInput: React.FC<MessageInputProps> = ({
  onSend,
  onSendAttachment,
  replyTo,
  onCancelReply,
}) => {
  const [text, setText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    if (!text.trim()) return;
    onSend(text, replyTo ?? undefined);
    setText('');
    onCancelReply?.();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === 'Escape' && replyTo) {
      onCancelReply?.();
    }
  };

  const handleAttachClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const caption = text.trim() || undefined;
      onSendAttachment(file, caption);
      if (caption) {
        setText('');
      }
      onCancelReply?.();
    }
    e.target.value = '';
  };

  return (
    <div className="wa-input-bar-wrap">
      {replyTo && (
        <div className="wa-reply-draft">
          <div className="wa-reply-draft__bar" aria-hidden="true" />
          <div className="wa-reply-draft__content">
            <div className="wa-reply-draft__author">
              {replyTo.authorName ? `Respondendo a ${replyTo.authorName}` : 'Respondendo'}
            </div>
            <div className="wa-reply-draft__text">
              {formatReplyDraftPreview(replyTo.text ?? '')}
            </div>
          </div>
          <button
            type="button"
            className="wa-reply-draft__close"
            onClick={onCancelReply}
            aria-label="Cancelar resposta"
          >
            <IonIcon icon={closeOutline} />
          </button>
        </div>
      )}
      <div className="wa-input-bar">
        <input
          ref={fileInputRef}
          type="file"
          accept={FILE_ACCEPT}
          hidden
          onChange={handleFileChange}
        />
        <IonIcon
          icon={attachOutline}
          className="wa-input-bar__icon"
          onClick={handleAttachClick}
          aria-label="Anexar arquivo"
        />
        <div className="wa-input-bar__field">
          <input
            type="text"
            placeholder="Mensagem"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>
        {text.trim() ? (
          <button className="wa-input-bar__send" onClick={handleSend} aria-label="Enviar">
            <IonIcon icon={send} />
          </button>
        ) : (
          <IonIcon icon={micOutline} className="wa-input-bar__icon" />
        )}
      </div>
    </div>
  );
};

export default MessageInput;
