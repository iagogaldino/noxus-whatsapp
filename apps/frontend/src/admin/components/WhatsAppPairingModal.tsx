import {
  IonButton,
  IonHeader,
  IonIcon,
  IonModal,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import { checkmarkCircleOutline, closeOutline } from 'ionicons/icons';
import QRCode from 'qrcode';
import { useEffect, useState } from 'react';
import { useWhatsAppConnection } from '../context/WhatsAppConnectionContext';

export const WhatsAppPairingModal: React.FC = () => {
  const {
    status,
    qrPayload,
    error,
    isModalOpen,
    closeModal,
    startPairing,
    stopPairing,
  } = useWhatsAppConnection();

  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!qrPayload) {
      setQrDataUrl(null);
      return;
    }

    let cancelled = false;

    void QRCode.toDataURL(qrPayload, { margin: 2, width: 256 }).then((url) => {
      if (!cancelled) {
        setQrDataUrl(url);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [qrPayload]);

  useEffect(() => {
    if (status !== 'connected' || !isModalOpen) {
      return;
    }

    const timer = setTimeout(() => {
      closeModal();
    }, 2000);

    return () => clearTimeout(timer);
  }, [status, isModalOpen, closeModal]);

  const handleDismiss = () => {
    stopPairing();
    closeModal();
  };

  const handleRetry = () => {
    void startPairing();
  };

  const showLoading = status === 'pairing' && !qrPayload;
  const showQr = status === 'pairing' && !!qrPayload;
  const showConnected = status === 'connected';
  const showError = status === 'error';

  return (
    <IonModal
      isOpen={isModalOpen}
      onDidDismiss={handleDismiss}
      className="admin-pairing-modal"
    >
      <div className="admin-pairing-modal__page">
        <IonHeader>
          <IonToolbar className="admin-toolbar-content">
            <IonTitle>Conectar WhatsApp</IonTitle>
            <IonButton slot="end" fill="clear" onClick={handleDismiss} aria-label="Fechar">
              <IonIcon icon={closeOutline} />
            </IonButton>
          </IonToolbar>
        </IonHeader>

        <div className="admin-pairing-modal__body">
          <div className="admin-pairing-modal__content">
            {showLoading && (
              <div className="admin-pairing-modal__state">
                <IonSpinner name="crescent" className="admin-pairing-modal__spinner" />
                <p className="admin-pairing-modal__message">Preparando código QR…</p>
              </div>
            )}

            {showQr && (
              <div className="admin-pairing-modal__state">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt="Código QR para pareamento WhatsApp"
                    className="admin-pairing-modal__qr-image"
                  />
                ) : (
                  <IonSpinner name="crescent" className="admin-pairing-modal__spinner" />
                )}
                <p className="admin-pairing-modal__message">
                  Abra o WhatsApp no celular e escaneie o código
                </p>
              </div>
            )}

            {showConnected && (
              <div className="admin-pairing-modal__state admin-pairing-modal__state--success">
                <IonIcon icon={checkmarkCircleOutline} className="admin-pairing-modal__success-icon" />
                <p className="admin-pairing-modal__message">WhatsApp conectado</p>
              </div>
            )}

            {showError && (
              <div className="admin-pairing-modal__state admin-pairing-modal__state--error">
                <p className="admin-pairing-modal__message admin-pairing-modal__message--error">
                  {error ?? 'Não foi possível conectar. Tente novamente.'}
                </p>
                <IonButton expand="block" className="admin-btn-primary" onClick={handleRetry}>
                  Tentar novamente
                </IonButton>
              </div>
            )}
          </div>

          {(showLoading || showQr) && (
            <IonButton
              fill="outline"
              expand="block"
              className="admin-btn-outline admin-pairing-modal__cancel"
              onClick={handleDismiss}
            >
              Cancelar
            </IonButton>
          )}
        </div>
      </div>
    </IonModal>
  );
};
