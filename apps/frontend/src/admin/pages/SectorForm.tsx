import {
  IonButton,
  IonContent,
  IonInput,
  IonItem,
  IonLabel,
  IonPage,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonTextarea,
  IonToast,
} from '@ionic/react';
import { useEffect, useState } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import { AdminHeader } from '../components/AdminHeader';
import { useSectors } from '../context/SectorContext';
import { SectorFormData } from '../types/sector';

const emptyForm: SectorFormData = {
  name: '',
  description: '',
  status: 'active',
};

const SectorForm: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const history = useHistory();
  const { getSectorById, createSector, updateSector, isLoading } = useSectors();
  const isEdit = !!id && id !== 'new';

  const [form, setForm] = useState<SectorFormData>(emptyForm);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isEdit && id) {
      const sector = getSectorById(id);
      if (sector) {
        setForm({
          name: sector.name,
          description: sector.description,
          status: sector.status,
        });
      }
    }
  }, [id, isEdit, getSectorById]);

  const updateField = <K extends keyof SectorFormData>(key: K, value: SectorFormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    const result = isEdit && id ? await updateSector(id, form) : await createSector(form);
    setSubmitting(false);

    if (result.success) {
      setToast(isEdit ? 'Setor atualizado!' : 'Setor criado!');
      setTimeout(() => history.push('/admin/sectors'), 800);
    } else {
      setError(result.error ?? 'Erro ao salvar.');
    }
  };

  if (isLoading && isEdit) {
    return (
      <IonPage className="admin-app">
        <AdminHeader title="Editar setor" />
        <IonContent className="admin-content">
          <div className="admin-empty">
            <IonSpinner name="crescent" />
          </div>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage className="admin-app">
      <AdminHeader title={isEdit ? 'Editar setor' : 'Novo setor'} />
      <IonContent className="admin-content">
        <div className="admin-page">
          <div className="admin-form-card">
            <h2 className="admin-form-card__title">
              {isEdit ? 'Editar dados' : 'Cadastrar setor'}
            </h2>

            <form onSubmit={(e) => void handleSubmit(e)} className="admin-form">
              <IonItem className="admin-form-item">
                <IonLabel position="stacked">Nome *</IonLabel>
                <IonInput
                  value={form.name}
                  onIonInput={(e) => updateField('name', e.detail.value ?? '')}
                  placeholder="Ex: Comercial"
                  required
                />
              </IonItem>

              <IonItem className="admin-form-item">
                <IonLabel position="stacked">Descrição</IonLabel>
                <IonTextarea
                  value={form.description}
                  onIonInput={(e) => updateField('description', e.detail.value ?? '')}
                  placeholder="Descrição do setor"
                  autoGrow
                />
              </IonItem>

              <IonItem className="admin-form-item">
                <IonLabel position="stacked">Status</IonLabel>
                <IonSelect
                  value={form.status}
                  onIonChange={(e) => updateField('status', e.detail.value)}
                  interface="popover"
                >
                  <IonSelectOption value="active">Ativo</IonSelectOption>
                  <IonSelectOption value="inactive">Inativo</IonSelectOption>
                </IonSelect>
              </IonItem>

              {error && <p className="admin-form-error">{error}</p>}

              <div className="admin-form-actions">
                <IonButton fill="outline" type="button" onClick={() => history.push('/admin/sectors')}>
                  Cancelar
                </IonButton>
                <IonButton className="admin-btn-primary" type="submit" disabled={submitting}>
                  {submitting ? 'Salvando…' : isEdit ? 'Salvar' : 'Criar'}
                </IonButton>
              </div>
            </form>
          </div>
        </div>

        <IonToast
          isOpen={!!toast}
          message={toast}
          duration={2000}
          color="success"
          onDidDismiss={() => setToast('')}
        />
      </IonContent>
    </IonPage>
  );
};

export default SectorForm;
