import {
  IonBackButton,
  IonButtons,
  IonHeader,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import { User } from '../types/chat';
import Avatar from './Avatar';

interface ChatHeaderProps {
  user: User;
  showBack?: boolean;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({ user, showBack }) => (
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
    </IonToolbar>
  </IonHeader>
);

export default ChatHeader;
