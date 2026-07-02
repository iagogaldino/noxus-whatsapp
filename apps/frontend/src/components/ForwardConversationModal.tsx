import {
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonModal,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import { businessOutline } from 'ionicons/icons';
import { useEffect, useState } from 'react';
import ContactListSkeleton from './ContactListSkeleton';
import { fetchActiveSectors, type SectorOption } from '../services/chatApi';

interface ForwardConversationModalProps {
  isOpen: boolean;
  chatName: string;
  onClose: () => void;
  onSelectSector: (sectorId: string) => Promise<{ success: boolean; error?: string }>;
}

const ForwardConversationModal: React.FC<ForwardConversationModalProps> = ({
  isOpen,
  chatName,
  onClose,
  onSelectSector,
}) => {
  const [sectors, setSectors] = useState<SectorOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;

    async function loadSectors() {
      setIsLoading(true);
      setError(null);
      try {
        const items = await fetchActiveSectors();
        if (!cancelled) {
          setSectors(items);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Falha ao carregar setores.');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadSectors();

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  const handleSelect = async (sectorId: string) => {
    setSubmittingId(sectorId);
    setError(null);

    const result = await onSelectSector(sectorId);
    setSubmittingId(null);

    if (result.success) {
      onClose();
      return;
    }

    setError(result.error ?? 'Falha ao encaminhar conversa.');
  };

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onClose} className="wa-forward-modal">
      <IonHeader>
        <IonToolbar className="wa-toolbar-secondary">
          <IonTitle>Encaminhar conversa</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <div className="wa-forward-modal__intro">
          <p>
            Encaminhar conversa com <strong>{chatName}</strong> para:
          </p>
        </div>

        {isLoading ? (
          <ContactListSkeleton count={4} />
        ) : error && sectors.length === 0 ? (
          <div className="wa-forward-modal__state">
            <p>{error}</p>
          </div>
        ) : sectors.length === 0 ? (
          <div className="wa-forward-modal__state">
            <p>Nenhum setor ativo cadastrado.</p>
          </div>
        ) : (
          <IonList className="wa-forward-modal__list">
            {sectors.map((sector) => (
              <IonItem
                key={sector.id}
                button
                detail={false}
                disabled={submittingId !== null}
                onClick={() => void handleSelect(sector.id)}
              >
                <IonIcon icon={businessOutline} slot="start" color="primary" />
                <IonLabel>
                  <h2>{sector.name}</h2>
                  {sector.description ? <p>{sector.description}</p> : null}
                </IonLabel>
                {submittingId === sector.id && <IonSpinner name="crescent" slot="end" />}
              </IonItem>
            ))}
          </IonList>
        )}

        {error && sectors.length > 0 && (
          <div className="wa-forward-modal__error">
            <p>{error}</p>
          </div>
        )}
      </IonContent>
    </IonModal>
  );
};

export default ForwardConversationModal;
