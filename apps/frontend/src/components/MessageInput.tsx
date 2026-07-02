import { IonIcon } from '@ionic/react';
import { attachOutline, micOutline, send } from 'ionicons/icons';
import { useRef, useState, KeyboardEvent, ChangeEvent } from 'react';

interface MessageInputProps {
  onSend: (text: string) => void;
  onSendAttachment: (file: File, caption?: string) => void;
}

const FILE_ACCEPT = 'image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip';

const MessageInput: React.FC<MessageInputProps> = ({ onSend, onSendAttachment }) => {
  const [text, setText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    if (!text.trim()) return;
    onSend(text);
    setText('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
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
    }
    e.target.value = '';
  };

  return (
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
  );
};

export default MessageInput;
