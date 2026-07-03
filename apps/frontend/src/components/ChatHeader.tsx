import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonPopover,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import { ellipsisVertical, shareOutline, trashOutline } from 'ionicons/icons';
import { useState } from 'react';
import { User } from '../types/chat';
import Avatar from './Avatar';

interface ChatHeaderProps {
  user: User;
  showBack?: boolean;
  isGroup?: boolean;
  onForward?: () => void;
  onDelete?: () => void;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({ user, showBack, isGroup, onForward, onDelete }) => {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [popoverEvent, setPopoverEvent] = useState<Event | undefined>();

  const openMenu = (event: React.MouseEvent<HTMLIonButtonElement>) => {
    setPopoverEvent(event.nativeEvent);
    setPopoverOpen(true);
  };

  return (
    <IonHeader>
      <IonToolbar className="wa-toolbar">
        <IonButtons slot="start" className="ion-hide-md-up">
          {showBack && <IonBackButton defaultHref="/" color="light" />}
        </IonButtons>
        <div className="wa-chat-header" slot="start" style={{ marginLeft: 8 }}>
          <Avatar user={user} size="medium" />
          <div className="wa-chat-header__info">
            <div className="wa-chat-header__name">{user.name}</div>
            <div className="wa-chat-header__status">{isGroup ? 'Grupo' : (user.status ?? 'online')}</div>
          </div>
        </div>
        <IonTitle style={{ display: 'none' }}>{user.name}</IonTitle>
        <IonButtons slot="end">
          <IonButton color="light" onClick={openMenu} aria-label="Mais opções">
            <IonIcon icon={ellipsisVertical} slot="icon-only" />
          </IonButton>
        </IonButtons>
      </IonToolbar>

      <IonPopover
        isOpen={popoverOpen}
        event={popoverEvent}
        onDidDismiss={() => setPopoverOpen(false)}
        dismissOnSelect
      >
        <IonContent>
          <IonList lines="none" className="wa-chat-menu">
            <IonItem
              button
              detail={false}
              onClick={() => {
                setPopoverOpen(false);
                onForward?.();
              }}
            >
              <IonIcon icon={shareOutline} slot="start" />
              <IonLabel>Encaminhar para setor</IonLabel>
            </IonItem>
            <IonItem
              button
              detail={false}
              className="wa-chat-menu__danger"
              onClick={() => {
                setPopoverOpen(false);
                onDelete?.();
              }}
            >
              <IonIcon icon={trashOutline} slot="start" color="danger" />
              <IonLabel color="danger">Remover conversa</IonLabel>
            </IonItem>
          </IonList>
        </IonContent>
      </IonPopover>
    </IonHeader>
  );
};

export default ChatHeader;
