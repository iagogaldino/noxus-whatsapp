import { IonIcon, IonSearchbar } from '@ionic/react';
import { searchOutline } from 'ionicons/icons';
import { useChat } from '../context/ChatContext';

interface SearchBarProps {
  showIcon?: boolean;
}

const SearchBar: React.FC<SearchBarProps> = ({ showIcon = false }) => {
  const { searchQuery, setSearchQuery } = useChat();

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: showIcon ? '0 12px 8px' : undefined }}>
      {showIcon && <IonIcon icon={searchOutline} style={{ color: 'var(--wa-text-secondary)', fontSize: '1.2rem' }} />}
      <IonSearchbar
        className="wa-searchbar"
        value={searchQuery}
        onIonInput={(e) => setSearchQuery(e.detail.value ?? '')}
        placeholder="Pesquisar ou começar uma nova conversa"
        debounce={200}
        style={{ flex: 1, padding: showIcon ? 0 : undefined }}
      />
    </div>
  );
};

export default SearchBar;
