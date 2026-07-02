import { IonButton, IonContent, IonIcon, IonPage } from '@ionic/react';
import { addOutline, arrowForwardOutline, peopleOutline, shieldOutline } from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useAppNavigate } from '../../utils/navigation';
import { AdminHeader } from '../components/AdminHeader';
import StatCard from '../components/StatCard';
import { useEmployees } from '../context/EmployeeContext';

const AdminDashboard: React.FC = () => {
  const history = useHistory();
  const { replace } = useAppNavigate();
  const { session } = useAuth();
  const { stats } = useEmployees();

  const firstName = session?.name.split(' ')[0] ?? 'Admin';

  return (
    <IonPage className="admin-app">
      <AdminHeader title="Dashboard" />
      <IonContent className="admin-content">
        <div className="admin-page">
          <div className="admin-hero">
            <div className="admin-hero__text">
              <span className="admin-hero__greeting">Bem-vindo de volta</span>
              <h2 className="admin-hero__name">{firstName}</h2>
              <p className="admin-hero__desc">Gerencie funcionários e acompanhe o time.</p>
            </div>
            <div className="admin-hero__badge">
              <IonIcon icon={shieldOutline} />
              <span>Admin</span>
            </div>
          </div>

          <div className="admin-section">
            <h3 className="admin-section__title">Resumo da equipe</h3>
            <div className="admin-stat-grid">
              <StatCard label="Total" value={stats.total} variant="total" />
              <StatCard label="Ativos" value={stats.active} variant="active" />
              <StatCard label="Inativos" value={stats.inactive} variant="inactive" />
              <StatCard label="Admins" value={stats.admins} variant="admins" />
            </div>
          </div>

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
