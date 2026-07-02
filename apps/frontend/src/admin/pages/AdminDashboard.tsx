import { IonButton, IonContent, IonIcon, IonPage, IonSpinner } from '@ionic/react';
import {
  addOutline,
  arrowForwardOutline,
  businessOutline,
  logoWhatsapp,
  peopleOutline,
} from 'ionicons/icons';
import { useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { useAppNavigate } from '../../utils/navigation';
import { AdminHeader } from '../components/AdminHeader';
import { WhatsAppPairingModal } from '../components/WhatsAppPairingModal';
import { useEmployees } from '../context/EmployeeContext';
import { useSectors } from '../context/SectorContext';
import { useWhatsAppConnection } from '../context/WhatsAppConnectionContext';

const AdminDashboard: React.FC = () => {
  const history = useHistory();
  const { replace } = useAppNavigate();
  const { stats } = useEmployees();
  const { sectors } = useSectors();
  const {
    status,
    instanceCode,
    startPairing,
    logout,
    openModal,
    isModalOpen,
  } = useWhatsAppConnection();

  useEffect(() => {
    if (status === 'pairing' && !isModalOpen) {
      openModal();
    }
  }, [status, isModalOpen, openModal]);

  const handleConnect = () => {
    void startPairing();
  };

  const handleDisconnect = () => {
    void logout();
  };

  return (
    <IonPage className="admin-app">
      <AdminHeader title="Dashboard" />
      <IonContent className="admin-content">
        <div className="admin-page">
          <div className="admin-section">
            <h3 className="admin-section__title">WhatsApp</h3>
            {status === 'connected' ? (
              <div className="admin-whatsapp-card admin-whatsapp-card--connected">
                <div className="admin-whatsapp-card__icon">
                  <IonIcon icon={logoWhatsapp} />
                </div>
                <div className="admin-whatsapp-card__content">
                  <span className="admin-whatsapp-card__label">WhatsApp conectado</span>
                  <span className="admin-whatsapp-card__hint">
                    Instância: {instanceCode ?? '—'}
                  </span>
                </div>
                <IonButton
                  fill="outline"
                  size="small"
                  className="admin-whatsapp-card__action"
                  onClick={handleDisconnect}
                >
                  Desconectar
                </IonButton>
              </div>
            ) : status === 'pairing' ? (
              <div className="admin-whatsapp-card admin-whatsapp-card--pairing">
                <div className="admin-whatsapp-card__icon">
                  <IonIcon icon={logoWhatsapp} />
                </div>
                <div className="admin-whatsapp-card__content">
                  <span className="admin-whatsapp-card__label">Conectando…</span>
                  <span className="admin-whatsapp-card__hint">
                    Aguardando pareamento no celular
                  </span>
                </div>
                <IonSpinner name="crescent" className="admin-whatsapp-card__spinner" />
              </div>
            ) : (
              <div className="admin-whatsapp-card admin-whatsapp-card--disconnected">
                <div className="admin-whatsapp-card__icon">
                  <IonIcon icon={logoWhatsapp} />
                </div>
                <div className="admin-whatsapp-card__content">
                  <span className="admin-whatsapp-card__label">WhatsApp desconectado</span>
                  <span className="admin-whatsapp-card__hint">
                    Conecte para enviar mensagens pela plataforma
                  </span>
                </div>
                <IonButton
                  size="small"
                  className="admin-whatsapp-card__action admin-btn-primary"
                  onClick={handleConnect}
                >
                  Conectar WhatsApp
                </IonButton>
              </div>
            )}
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
                onClick={() => history.push('/admin/sectors')}
              >
                <div className="admin-action-card__icon admin-action-card__icon--primary">
                  <IonIcon icon={businessOutline} />
                </div>
                <div className="admin-action-card__content">
                  <span className="admin-action-card__label">Ver setores</span>
                  <span className="admin-action-card__hint">{sectors.length} cadastrados</span>
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

      <WhatsAppPairingModal />
    </IonPage>
  );
};

export default AdminDashboard;
