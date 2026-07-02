import { IonIcon, IonItem, IonLabel, IonList } from '@ionic/react';
import { menuController } from '@ionic/core';
import {
  chatbubblesOutline,
  gridOutline,
  logOutOutline,
  peopleOutline,
  businessOutline,
} from 'ionicons/icons';
import { useHistory, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useAppNavigate } from '../../utils/navigation';
import { formatPhoneLabel } from '../../utils/phone';

const AdminMenu: React.FC = () => {
  const history = useHistory();
  const location = useLocation();
  const { replace } = useAppNavigate();
  const { logout, session } = useAuth();

  const items = [
    { label: 'Dashboard', path: '/admin', icon: gridOutline, exact: true },
    { label: 'Funcionários', path: '/admin/employees', icon: peopleOutline, exact: false },
    { label: 'Setores', path: '/admin/sectors', icon: businessOutline, exact: false },
  ];

  const isActive = (path: string, exact: boolean) =>
    exact ? location.pathname === path : location.pathname.startsWith(path);

  const goToChat = async () => {
    await menuController.close('admin-menu');
    replace('/');
  };

  const navigate = async (path: string) => {
    await menuController.close('admin-menu');
    history.push(path);
  };

  const handleLogout = async () => {
    await menuController.close('admin-menu');
    logout();
    replace('/login');
  };

  return (
    <div className="admin-menu__inner">
      <div className="admin-menu__brand">
        <div className="admin-menu__logo">
          <IonIcon icon={chatbubblesOutline} />
        </div>
        <div>
          <h2>Noxus Admin</h2>
          <p>Painel de gestão</p>
        </div>
      </div>

      {session && (
        <div className="admin-menu__user">
          <div className="admin-menu__avatar">{session.name.charAt(0).toUpperCase()}</div>
          <div className="admin-menu__user-info">
            <span className="admin-menu__user-name">{session.name}</span>
            <span className="admin-menu__user-email">{formatPhoneLabel(session.phone)}</span>
          </div>
        </div>
      )}

      <nav className="admin-menu__nav">
        <IonList lines="none">
          {items.map((item) => (
            <IonItem
              key={item.path}
              button
              detail={false}
              className={isActive(item.path, item.exact) ? 'admin-menu__item--active' : ''}
              onClick={() => navigate(item.path)}
            >
              <IonIcon icon={item.icon} slot="start" />
              <IonLabel>{item.label}</IonLabel>
            </IonItem>
          ))}
        </IonList>
      </nav>

      <div className="admin-menu__footer">
        <IonItem button detail={false} onClick={goToChat} lines="none">
          <IonIcon icon={chatbubblesOutline} slot="start" />
          <IonLabel>Ir para o chat</IonLabel>
        </IonItem>
        <IonItem button detail={false} onClick={handleLogout} lines="none">
          <IonIcon icon={logOutOutline} slot="start" />
          <IonLabel>Sair</IonLabel>
        </IonItem>
      </div>
    </div>
  );
};

export default AdminMenu;
