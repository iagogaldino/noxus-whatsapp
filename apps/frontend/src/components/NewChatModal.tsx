import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonModal,
  IonSearchbar,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import { arrowBackOutline, callOutline } from 'ionicons/icons';
import { useEffect, useMemo, useState } from 'react';
import {
  contactChatId,
  contactDisplayName,
  fetchContacts,
  WhatsAppContact,
} from '../services/chatApi';
import { formatPhoneLabel, isValidWhatsAppPhone, normalizePhoneInput } from '../utils/phone';
import Avatar from './Avatar';

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectContact: (chatId: string, participantName: string) => void;
}

const NewChatModal: React.FC<NewChatModalProps> = ({ isOpen, onClose, onSelectContact }) => {
  const [contacts, setContacts] = useState<WhatsAppContact[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [phoneError, setPhoneError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;

    async function loadContacts() {
      setIsLoading(true);
      setError(null);

      try {
        const items = await fetchContacts('all');
        if (!cancelled) {
          setContacts(items);
        }
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'Erro ao carregar contatos.';
          setError(message);
          setContacts([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadContacts();

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setPhoneInput('');
      setPhoneError(null);
      setError(null);
    }
  }, [isOpen]);

  const filteredContacts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return contacts;

    return contacts.filter((contact) => {
      const name = contactDisplayName(contact).toLowerCase();
      const phone = contactChatId(contact);
      return name.includes(query) || phone.includes(normalizePhoneInput(query));
    });
  }, [contacts, searchQuery]);

  const handleSelectContact = (contact: WhatsAppContact) => {
    onSelectContact(contactChatId(contact), contactDisplayName(contact));
  };

  const handleStartByPhone = () => {
    const digits = normalizePhoneInput(phoneInput);
    if (!isValidWhatsAppPhone(digits)) {
      setPhoneError('Informe um número válido com DDI e DDD (10 a 15 dígitos).');
      return;
    }

    setPhoneError(null);
    onSelectContact(digits, formatPhoneLabel(digits));
  };

  const searchDigits = normalizePhoneInput(searchQuery);
  const canStartFromSearch = isValidWhatsAppPhone(searchDigits) &&
    !filteredContacts.some((contact) => contactChatId(contact) === searchDigits);

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onClose} className="wa-new-chat-modal">
      <IonHeader>
        <IonToolbar className="wa-toolbar">
          <IonButtons slot="start">
            <IonButton fill="clear" color="light" onClick={onClose} aria-label="Voltar">
              <IonIcon icon={arrowBackOutline} slot="icon-only" />
            </IonButton>
          </IonButtons>
          <IonTitle>Nova conversa</IonTitle>
        </IonToolbar>
        <IonToolbar className="wa-toolbar-secondary">
          <IonSearchbar
            className="wa-searchbar"
            value={searchQuery}
            onIonInput={(event) => setSearchQuery(event.detail.value ?? '')}
            placeholder="Pesquisar nome ou número"
            debounce={150}
          />
        </IonToolbar>
      </IonHeader>

      <IonContent>
        {canStartFromSearch && (
          <IonList lines="full" className="wa-new-chat__section">
            <IonItem button detail={false} onClick={() => onSelectContact(searchDigits, formatPhoneLabel(searchDigits))}>
              <IonIcon icon={callOutline} slot="start" className="wa-new-chat__phone-icon" />
              <IonLabel>
                <h2>Conversar com {formatPhoneLabel(searchDigits)}</h2>
                <p>Número não está na agenda</p>
              </IonLabel>
            </IonItem>
          </IonList>
        )}

        <div className="wa-new-chat__section-title">Contatos na agenda</div>

        {isLoading ? (
          <div className="wa-new-chat__state">
            <IonSpinner name="crescent" />
            <p>Carregando contatos…</p>
          </div>
        ) : error ? (
          <div className="wa-new-chat__state">
            <p>{error}</p>
          </div>
        ) : filteredContacts.length === 0 ? (
          <div className="wa-new-chat__state">
            <p>Nenhum contato encontrado.</p>
          </div>
        ) : (
          <IonList lines="full">
            {filteredContacts.map((contact) => {
              const chatId = contactChatId(contact);
              const name = contactDisplayName(contact);

              return (
                <IonItem
                  key={`${contact.jid}-${chatId}`}
                  button
                  detail={false}
                  onClick={() => handleSelectContact(contact)}
                >
                  <div slot="start" className="wa-new-chat__avatar">
                    <Avatar
                      user={{
                        id: chatId,
                        name,
                        avatarColor: '#128C7E',
                      }}
                    />
                  </div>
                  <IonLabel>
                    <h2>{name}</h2>
                    <p>{formatPhoneLabel(chatId)}</p>
                  </IonLabel>
                </IonItem>
              );
            })}
          </IonList>
        )}

        <div className="wa-new-chat__phone-card">
          <div className="wa-new-chat__section-title">Enviar para número</div>
          <IonItem lines="none" className="wa-new-chat__phone-input">
            <IonInput
              type="tel"
              inputMode="tel"
              placeholder="Ex.: 5511999999999"
              value={phoneInput}
              onIonInput={(event) => {
                setPhoneInput(event.detail.value ?? '');
                setPhoneError(null);
              }}
            />
          </IonItem>
          {phoneError && <p className="wa-new-chat__phone-error">{phoneError}</p>}
          <IonButton expand="block" className="wa-new-chat__phone-btn" onClick={handleStartByPhone}>
            Iniciar conversa
          </IonButton>
        </div>
      </IonContent>
    </IonModal>
  );
};

export default NewChatModal;
