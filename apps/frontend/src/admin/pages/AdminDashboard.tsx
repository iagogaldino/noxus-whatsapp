import { IonButton, IonContent, IonIcon, IonPage } from '@ionic/react';
import { addOutline, arrowForwardOutline, peopleOutline } from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import { useAppNavigate } from '../../utils/navigation';
import { AdminHeader } from '../components/AdminHeader';
import { useEmployees } from '../context/EmployeeContext';

const AdminDashboard: React.FC = () => {
  const history = useHistory();
  const { replace } = useAppNavigate();
  const { stats } = useEmployees();

  return (
    <IonPage className="admin-app">
      <AdminHeader title="Dashboard" />
      <IonContent className="admin-content">
        <div className="admin-page">
          <div className="admin-section">
            <h3 className="admin-section__title">Ações rápidas</h3>
            <div className="admin-actions">
              <button
                type="button"
                className="admin-action-card"
                onClick={() => history.push('/admin/employees')}
              >
                <div className="admin-action-card__icon admin-action-card__icon--primary">
                  <IonIcon icon={peopleOutline} />
                </div>
                <div className="admin-action-card__content">
                  <span className="admin-action-card__label">Ver funcionários</span>
                  <span className="admin-action-card__hint">{stats.total} cadastrados</span>
                </div>
                <IonIcon icon={arrowForwardOutline} className="admin-action-card__arrow" />
              </button>

              <button
                type="button"
                className="admin-action-card"
                onClick={() => history.push('/admin/employees/new')}
              >
                <div className="admin-action-card__icon admin-action-card__icon--accent">
                  <IonIcon icon={addOutline} />
                </div>
                <div className="admin-action-card__content">
                  <span className="admin-action-card__label">Novo funcionário</span>
                  <span className="admin-action-card__hint">Adicionar conta</span>
                </div>
                <IonIcon icon={arrowForwardOutline} className="admin-action-card__arrow" />
              </button>
            </div>
          </div>

          <div className="admin-section admin-section--footer">
            <IonButton
              fill="clear"
              className="admin-back-chat"
              onClick={() => replace('/')}
            >
              Ir para o chat
            </IonButton>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default AdminDashboard;
