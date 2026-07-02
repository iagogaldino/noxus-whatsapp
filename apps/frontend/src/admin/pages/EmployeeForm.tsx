import {
  IonButton,
  IonContent,
  IonInput,
  IonItem,
  IonLabel,
  IonNote,
  IonPage,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonToast,
} from '@ionic/react';
import { useEffect, useMemo, useState } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import PhoneInput from '../../components/PhoneInput';
import { normalizePhoneInput } from '../../utils/phone';
import { AdminHeader } from '../components/AdminHeader';
import { useEmployees } from '../context/EmployeeContext';
import { useSectors } from '../context/SectorContext';
import { EmployeeFormData, EmployeeRole, EmployeeStatus } from '../types/employee';

const emptyForm: EmployeeFormData = {
  name: '',
  phone: '',
  department: '',
  sectorId: null,
  role: 'employee',
  status: 'active',
};

const EmployeeForm: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const history = useHistory();
  const { getEmployeeById, createEmployee, updateEmployee } = useEmployees();
  const { sectors, isLoading: sectorsLoading, error: sectorsError } = useSectors();
  const isEdit = !!id && id !== 'new';

  const [form, setForm] = useState<EmployeeFormData>(emptyForm);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isEdit && id) {
      const employee = getEmployeeById(id);
      if (employee) {
        setForm({
          name: employee.name,
          phone: normalizePhoneInput(employee.phone),
          department: employee.department ?? '',
          sectorId: employee.sectorId ?? null,
          role: employee.role,
          status: employee.status,
        });
      }
    }
  }, [id, isEdit, getEmployeeById]);

  const legacyDepartment = useMemo(() => {
    if (!form.department) return null;
    const exists = sectors.some((sector) => sector.name === form.department);
    return exists ? null : form.department;
  }, [form.department, sectors]);

  const updateField = <K extends keyof EmployeeFormData>(key: K, value: EmployeeFormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSectorChange = (sectorId: string) => {
    const sector = sectors.find((item) => item.id === sectorId);
    setForm((prev) => ({
      ...prev,
      sectorId: sectorId || null,
      department: sector?.name ?? '',
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    const result = isEdit && id ? await updateEmployee(id, form) : await createEmployee(form);
    setSubmitting(false);

    if (result.success) {
      setToast(isEdit ? 'Funcionário atualizado!' : 'Funcionário criado!');
      setTimeout(() => history.push('/admin/employees'), 800);
    } else {
      setError(result.error ?? 'Erro ao salvar.');
    }
  };

  return (
    <IonPage className="admin-app">
      <AdminHeader title={isEdit ? 'Editar funcionário' : 'Novo funcionário'} />
      <IonContent className="admin-content">
        <div className="admin-page">
          <div className="admin-form-card">
            <h2 className="admin-form-card__title">
              {isEdit ? 'Editar dados' : 'Cadastrar funcionário'}
            </h2>
            <p className="admin-form-card__subtitle">
              O acesso é feito por OTP no WhatsApp usando o telefone cadastrado.
            </p>

            <form className="admin-form" onSubmit={(e) => void handleSubmit(e)}>
              <IonItem className="admin-form__item" lines="none">
                <IonLabel position="stacked">Nome *</IonLabel>
                <IonInput
                  value={form.name}
                  onIonInput={(e) => updateField('name', e.detail.value ?? '')}
                  required
                />
              </IonItem>

              <div className="admin-form__phone-field">
                <span className="admin-form__phone-label">Telefone *</span>
                <div className="admin-form__phone-input">
                  <PhoneInput
                    id="employee-phone"
                    value={form.phone}
                    onChange={(phone) => updateField('phone', phone)}
                  />
                </div>
              </div>

              <IonItem className="admin-form__item" lines="none">
                <IonLabel position="stacked">Setor</IonLabel>
                {sectorsLoading ? (
                  <div className="admin-form__inline-loading">
                    <IonSpinner name="crescent" />
                    <span>Carregando setores…</span>
                  </div>
                ) : (
                  <IonSelect
                    value={form.sectorId ?? undefined}
                    placeholder="Selecione um setor"
                    interface="popover"
                    onIonChange={(e) => handleSectorChange(e.detail.value)}
                  >
                    {legacyDepartment && (
                      <IonSelectOption value="">{legacyDepartment} (não cadastrado)</IonSelectOption>
                    )}
                    {sectors.map((sector) => (
                      <IonSelectOption key={sector.id} value={sector.id}>
                        {sector.name}
                        {sector.status === 'inactive' ? ' (inativo)' : ''}
                      </IonSelectOption>
                    ))}
                  </IonSelect>
                )}
                {sectorsError && <IonNote color="danger">{sectorsError}</IonNote>}
              </IonItem>

              <IonItem className="admin-form__item" lines="none">
                <IonLabel position="stacked">Cargo</IonLabel>
                <IonSelect
                  value={form.role}
                  onIonChange={(e) => updateField('role', e.detail.value as EmployeeRole)}
                >
                  <IonSelectOption value="employee">Funcionário</IonSelectOption>
                  <IonSelectOption value="admin">Admin</IonSelectOption>
                </IonSelect>
              </IonItem>

              <IonItem className="admin-form__item" lines="none">
                <IonLabel position="stacked">Status</IonLabel>
                <IonSelect
                  value={form.status}
                  onIonChange={(e) => updateField('status', e.detail.value as EmployeeStatus)}
                >
                  <IonSelectOption value="active">Ativo</IonSelectOption>
                  <IonSelectOption value="inactive">Inativo</IonSelectOption>
                </IonSelect>
              </IonItem>

              {error && <p className="admin-form__error">{error}</p>}

              <IonButton expand="block" type="submit" className="admin-btn-primary" disabled={submitting}>
                {submitting ? 'Salvando…' : 'Salvar'}
              </IonButton>
              <IonButton
                expand="block"
                fill="outline"
                type="button"
                className="admin-btn-outline"
                onClick={() => history.push('/admin/employees')}
              >
                Cancelar
              </IonButton>
            </form>
          </div>
        </div>

        <IonToast
          isOpen={!!toast}
          message={toast}
          duration={1500}
          color="success"
          onDidDismiss={() => setToast('')}
        />
      </IonContent>
    </IonPage>
  );
};

export default EmployeeForm;
