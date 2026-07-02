import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonPage,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import {
  chatbubbleOutline,
  gridOutline,
  keyOutline,
  lockClosedOutline,
  logOutOutline,
  notificationsOutline,
  personOutline,
  shieldOutline,
} from 'ionicons/icons';
import Avatar from '../components/Avatar';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { useAppNavigate } from '../utils/navigation';

const Profile: React.FC = () => {
  const { replace } = useAppNavigate();
  const { logout, isAdmin } = useAuth();
  const { currentUser } = useChat();

  const handleLogout = () => {
    logout();
    replace('/login');
  };

  const menuItems: Array<{
    icon: string;
    label: string;
    action?: () => void;
  }> = [
    { icon: personOutline, label: 'Conta' },
    { icon: lockClosedOutline, label: 'Privacidade' },
    { icon: chatbubbleOutline, label: 'Conversas' },
    { icon: notificationsOutline, label: 'Notificações' },
    { icon: shieldOutline, label: 'Armazenamento e dados' },
    { icon: keyOutline, label: 'Ajuda' },
    ...(isAdmin
      ? [{ icon: gridOutline, label: 'Painel Admin', action: () => replace('/admin') }]
      : []),
    { icon: logOutOutline, label: 'Sair', action: handleLogout },
  ];

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar className="wa-toolbar">
          <IonButtons slot="start">
            <IonBackButton defaultHref="/" color="light" />
          </IonButtons>
          <IonTitle>Perfil</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <div className="wa-profile-header">
          <Avatar user={currentUser} size="large" />
          <h2 className="wa-profile-name">{currentUser.name}</h2>
          <p className="wa-profile-status">{currentUser.status}</p>
        </div>
        <IonList>
          {menuItems.map((item) => (
            <IonItem
              key={item.label}
              className="wa-profile-item"
              button
              detail={!item.action}
              onClick={item.action}
            >
              <IonIcon icon={item.icon} slot="start" />
              <IonLabel>{item.label}</IonLabel>
            </IonItem>
          ))}
        </IonList>
      </IonContent>
    </IonPage>
  );
};

export default Profile;
