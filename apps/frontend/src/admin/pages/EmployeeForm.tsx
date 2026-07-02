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
import { AdminHeader } from '../components/AdminHeader';
import { useEmployees } from '../context/EmployeeContext';
import { useSectors } from '../context/SectorContext';
import { EmployeeFormData, EmployeeRole, EmployeeStatus } from '../types/employee';

const emptyForm: EmployeeFormData = {
  name: '',
  email: '',
  phone: '',
  department: '',
  role: 'employee',
  status: 'active',
  password: '',
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

  const legacyDepartment = useMemo(() => {
    if (!form.department) return null;
    const exists = sectors.some((sector) => sector.name === form.department);
    return exists ? null : form.department;
  }, [form.department, sectors]);

  useEffect(() => {
    if (isEdit && id) {
      const employee = getEmployeeById(id);
      if (employee) {
        setForm({
          name: employee.name,
          email: employee.email,
          phone: employee.phone ?? '',
          department: employee.department ?? '',
          role: employee.role,
          status: employee.status,
          password: '',
        });
      }
    }
  }, [id, isEdit, getEmployeeById]);

  const updateField = <K extends keyof EmployeeFormData>(key: K, value: EmployeeFormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const result = isEdit && id ? updateEmployee(id, form) : createEmployee(form);

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
              {isEdit
                ? 'Atualize as informações da conta.'
                : 'Preencha os dados para criar uma nova conta.'}
            </p>

            <form className="admin-form" onSubmit={handleSubmit}>
              <IonItem className="admin-form__item" lines="none">
                <IonLabel position="stacked">Nome *</IonLabel>
                <IonInput
                  value={form.name}
                  onIonInput={(e) => updateField('name', e.detail.value ?? '')}
                  required
                />
              </IonItem>

              <IonItem className="admin-form__item" lines="none">
                <IonLabel position="stacked">E-mail *</IonLabel>
                <IonInput
                  type="email"
                  value={form.email}
                  onIonInput={(e) => updateField('email', e.detail.value ?? '')}
                  required
                />
              </IonItem>

              <IonItem className="admin-form__item" lines="none">
                <IonLabel position="stacked">Telefone</IonLabel>
                <IonInput
                  type="tel"
                  value={form.phone}
                  onIonInput={(e) => updateField('phone', e.detail.value ?? '')}
                />
              </IonItem>

              <IonItem className="admin-form__item" lines="none">
                <IonLabel position="stacked">Departamento</IonLabel>
                {sectorsLoading ? (
                  <div className="admin-form__inline-loading">
                    <IonSpinner name="crescent" />
                    <span>Carregando setores…</span>
                  </div>
                ) : (
                  <IonSelect
                    value={form.department}
                    placeholder="Selecione um setor"
                    interface="popover"
                    onIonChange={(e) => updateField('department', e.detail.value ?? '')}
                  >
                    {legacyDepartment && (
                      <IonSelectOption value={legacyDepartment}>
                        {legacyDepartment} (não cadastrado)
                      </IonSelectOption>
                    )}
                    {sectors.map((sector) => (
                      <IonSelectOption key={sector.id} value={sector.name}>
                        {sector.name}
                        {sector.status === 'inactive' ? ' (inativo)' : ''}
                      </IonSelectOption>
                    ))}
                  </IonSelect>
                )}
                {sectorsError && <IonNote color="danger">{sectorsError}</IonNote>}
                {!sectorsLoading && sectors.length === 0 && (
                  <IonNote color="medium">
                    Nenhum setor cadastrado. Cadastre em Setores antes de atribuir.
                  </IonNote>
                )}
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

              <IonItem className="admin-form__item" lines="none">
                <IonLabel position="stacked">
                  {isEdit ? 'Nova senha (opcional)' : 'Senha *'}
                </IonLabel>
                <IonInput
                  type="password"
                  value={form.password}
                  onIonInput={(e) => updateField('password', e.detail.value ?? '')}
                  placeholder={isEdit ? 'Deixe em branco para manter' : ''}
                  required={!isEdit}
                />
              </IonItem>

              {error && <p className="admin-form__error">{error}</p>}

              <IonButton expand="block" type="submit" className="admin-btn-primary">
                Salvar
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
