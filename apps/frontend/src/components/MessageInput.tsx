import { IonIcon } from '@ionic/react';
import { attachOutline, micOutline, send } from 'ionicons/icons';
import { useState, KeyboardEvent } from 'react';

interface MessageInputProps {
  onSend: (text: string) => void;
}

const MessageInput: React.FC<MessageInputProps> = ({ onSend }) => {
  const [text, setText] = useState('');

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

  return (
    <div className="wa-input-bar">
      <IonIcon icon={attachOutline} className="wa-input-bar__icon" />
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
