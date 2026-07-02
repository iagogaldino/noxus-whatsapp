import {
  IonButton,
  IonButtons,
  IonHeader,
  IonIcon,
  IonMenuButton,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import { logOutOutline } from 'ionicons/icons';
import { useAuth } from '../../context/AuthContext';
import { useAppNavigate } from '../../utils/navigation';

export const AdminHeader: React.FC<{ title: string }> = ({ title }) => {
  const { replace } = useAppNavigate();
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    replace('/login');
  };

  return (
    <IonHeader>
      {/* Mobile: toolbar verde com hamburger */}
      <IonToolbar className="admin-toolbar ion-hide-md-up">
        <IonButtons slot="start">
          <IonMenuButton menu="admin-menu" color="light" />
        </IonButtons>
        <IonTitle>{title}</IonTitle>
        <IonButtons slot="end">
          <IonButton fill="clear" color="light" onClick={handleLogout}>
            <IonIcon icon={logOutOutline} slot="icon-only" />
          </IonButton>
        </IonButtons>
      </IonToolbar>

      {/* Desktop: toolbar leve no painel de conteúdo */}
      <IonToolbar className="admin-toolbar-content ion-hide-md-down">
        <IonTitle>{title}</IonTitle>
      </IonToolbar>
    </IonHeader>
  );
};
