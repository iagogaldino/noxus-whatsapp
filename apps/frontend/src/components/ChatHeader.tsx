import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonPopover,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import { callOutline, ellipsisVertical, searchOutline, videocamOutline } from 'ionicons/icons';
import { useState } from 'react';
import { User } from '../types/chat';
import Avatar from './Avatar';

interface ChatHeaderProps {
  user: User;
  showBack?: boolean;
}

const menuItems = [
  { icon: searchOutline, label: 'Pesquisar' },
  { icon: callOutline, label: 'Ligar' },
  { icon: videocamOutline, label: 'Vídeo' },
];

const ChatHeader: React.FC<ChatHeaderProps> = ({ user, showBack }) => {
  const [popoverEvent, setPopoverEvent] = useState<MouseEvent | undefined>();

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
            <div className="wa-chat-header__status">{user.status ?? 'online'}</div>
          </div>
        </div>
        <IonTitle style={{ display: 'none' }}>{user.name}</IonTitle>
        <IonButtons slot="end">
          <IonButton
            fill="clear"
            color="light"
            onClick={(e) => setPopoverEvent(e.nativeEvent)}
            aria-label="Mais opções"
          >
            <IonIcon icon={ellipsisVertical} slot="icon-only" />
          </IonButton>
        </IonButtons>
      </IonToolbar>
      <IonPopover
        isOpen={!!popoverEvent}
        event={popoverEvent}
        onDidDismiss={() => setPopoverEvent(undefined)}
        dismissOnSelect
      >
        <IonList lines="none">
          {menuItems.map((item) => (
            <IonItem key={item.label} button detail={false}>
              <IonIcon icon={item.icon} slot="start" />
              <IonLabel>{item.label}</IonLabel>
            </IonItem>
          ))}
        </IonList>
      </IonPopover>
    </IonHeader>
  );
};

export default ChatHeader;
