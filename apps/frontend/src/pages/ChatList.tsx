import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonPage,
  IonPopover,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import {
  ellipsisVertical,
  gridOutline,
  personOutline,
} from 'ionicons/icons';
import { useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import ChatListItem from '../components/ChatListItem';
import SearchBar from '../components/SearchBar';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { useAppNavigate } from '../utils/navigation';

interface ChatListProps {
  /** Lista fixa no painel lateral (desktop) */
  sidebar?: boolean;
  /** Lista em tela cheia no mobile quando não há chat aberto */
  mobileOnly?: boolean;
}

const ChatList: React.FC<ChatListProps> = ({ sidebar = false, mobileOnly = false }) => {
  const history = useHistory();
  const location = useLocation();
  const { replace } = useAppNavigate();
  const { filteredConversations, markAsRead, isLoading, error } = useChat();
  const { isAdmin } = useAuth();
  const [popoverEvent, setPopoverEvent] = useState<MouseEvent | undefined>();
  const [pendingPath, setPendingPath] = useState<string | null>(null);

  const activeChatId = location.pathname.startsWith('/chat/')
    ? location.pathname.split('/chat/')[1]
    : undefined;

  const openChat = (chatId: string) => {
    markAsRead(chatId);
    history.push(`/chat/${chatId}`);
  };

  const openMenu = (e: React.MouseEvent) => {
    setPopoverEvent(e.nativeEvent);
  };

  const navigateFromMenu = (path: string) => {
    setPendingPath(path);
    setPopoverEvent(undefined);
  };

  const content = (
    <>
      <IonHeader>
        <IonToolbar className="wa-toolbar">
          <IonTitle>WhatsApp</IonTitle>
          <IonButtons slot="end">
            <IonButton
              fill="clear"
              color="light"
              aria-label="Mais opções"
              onClick={openMenu}
            >
              <IonIcon icon={ellipsisVertical} slot="icon-only" />
            </IonButton>
          </IonButtons>
        </IonToolbar>
        <IonToolbar className="wa-toolbar-secondary">
          <SearchBar />
        </IonToolbar>
      </IonHeader>

      <IonPopover
        isOpen={!!popoverEvent}
        event={popoverEvent}
        onDidDismiss={() => {
          setPopoverEvent(undefined);
          if (pendingPath) {
            replace(pendingPath);
            setPendingPath(null);
          }
        }}
      >
        <IonList lines="none">
          <IonItem button detail={false} onClick={() => navigateFromMenu('/profile')}>
            <IonIcon icon={personOutline} slot="start" />
            <IonLabel>Perfil</IonLabel>
          </IonItem>
          {isAdmin && (
            <IonItem button detail={false} onClick={() => navigateFromMenu('/admin')}>
              <IonIcon icon={gridOutline} slot="start" />
              <IonLabel>Painel Admin</IonLabel>
            </IonItem>
          )}
        </IonList>
      </IonPopover>

      <IonContent className={sidebar ? 'wa-sidebar-content' : undefined}>
        {isLoading ? (
          <div className="wa-empty-state">
            <p>Carregando conversas…</p>
          </div>
        ) : error ? (
          <div className="wa-empty-state">
            <p>{error}</p>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="wa-empty-state">
            <p>Nenhuma conversa encontrada.</p>
          </div>
        ) : (
          <IonList lines="none">
            {filteredConversations.map((conversation) => (
              <ChatListItem
                key={conversation.id}
                conversation={conversation}
                isActive={activeChatId === conversation.id}
                onClick={() => openChat(conversation.id)}
              />
            ))}
          </IonList>
        )}
      </IonContent>
    </>
  );

  if (sidebar) {
    return (
      <div className="wa-chat-list wa-chat-list--sidebar ion-hide-md-down">{content}</div>
    );
  }

  return <IonPage className={mobileOnly ? 'ion-hide-md-up' : 'wa-chat-list'}>{content}</IonPage>;
};

export default ChatList;
