import {
  IonAlert,
  IonButton,
  IonContent,
  IonFab,
  IonFabButton,
  IonIcon,
  IonList,
  IonPage,
  IonSearchbar,
} from '@ionic/react';
import { addOutline, createOutline, trashOutline } from 'ionicons/icons';
import { useState } from 'react';
import { useHistory } from 'react-router-dom';
import { AdminHeader } from '../components/AdminHeader';
import EmployeeListItem from '../components/EmployeeListItem';
import { useEmployees } from '../context/EmployeeContext';
import { Employee } from '../types/employee';

const EmployeeList: React.FC = () => {
  const history = useHistory();
  const { searchEmployees, deleteEmployee } = useEmployees();
  const [query, setQuery] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Employee | null>(null);

  const filtered = searchEmployees(query);

  const handleDelete = () => {
    if (deleteTarget) {
      deleteEmployee(deleteTarget.id);
      setDeleteTarget(null);
    }
  };

  return (
    <IonPage className="admin-app">
      <AdminHeader title="Funcionários" />
      <IonContent className="admin-content">
        <div className="admin-page">
          <div className="admin-page__header">
            <div>
              <h2 className="admin-page__title">Equipe</h2>
              <p className="admin-page__subtitle">{filtered.length} funcionário(s)</p>
            </div>
            <IonButton
              className="admin-btn-primary ion-hide-sm-down"
              onClick={() => history.push('/admin/employees/new')}
            >
              <IonIcon icon={addOutline} slot="start" />
              Novo
            </IonButton>
          </div>

          <IonSearchbar
            className="admin-searchbar"
            value={query}
            onIonInput={(e) => setQuery(e.detail.value ?? '')}
            placeholder="Buscar por nome, e-mail ou departamento"
            debounce={200}
          />

          <div className="admin-mobile-list">
            <IonList className="admin-list">
              {filtered.map((employee) => (
                <EmployeeListItem
                  key={employee.id}
                  employee={employee}
                  onEdit={(id) => history.push(`/admin/employees/${id}/edit`)}
                  onDelete={setDeleteTarget}
                />
              ))}
            </IonList>
          </div>

          <div className="admin-desktop-table">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>E-mail</th>
                  <th>Departamento</th>
                  <th>Cargo</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((employee) => (
                  <tr key={employee.id}>
                    <td className="admin-table__name">{employee.name}</td>
                    <td>{employee.email}</td>
                    <td>{employee.department ?? '—'}</td>
                    <td>
                      <span className={`admin-badge admin-badge--${employee.role}`}>
                        {employee.role === 'admin' ? 'Admin' : 'Funcionário'}
                      </span>
                    </td>
                    <td>
                      <span className={`admin-badge admin-badge--${employee.status}`}>
                        {employee.status === 'active' ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td>
                      <div className="admin-employee-actions">
                        <IonButton
                          fill="clear"
                          size="small"
                          className="admin-btn-icon"
                          onClick={() => history.push(`/admin/employees/${employee.id}/edit`)}
                        >
                          <IonIcon icon={createOutline} slot="icon-only" />
                        </IonButton>
                        <IonButton
                          fill="clear"
                          size="small"
                          color="danger"
                          onClick={() => setDeleteTarget(employee)}
                        >
                          <IonIcon icon={trashOutline} slot="icon-only" />
                        </IonButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filtered.length === 0 && (
            <div className="admin-empty">
              <p>Nenhum funcionário encontrado.</p>
            </div>
          )}
        </div>

        <IonFab vertical="bottom" horizontal="end" slot="fixed" className="ion-hide-md-up">
          <IonFabButton className="admin-fab" onClick={() => history.push('/admin/employees/new')}>
            <IonIcon icon={addOutline} />
          </IonFabButton>
        </IonFab>

        <IonAlert
          isOpen={!!deleteTarget}
          onDidDismiss={() => setDeleteTarget(null)}
          header="Remover funcionário"
          message={`Deseja remover ${deleteTarget?.name}? Esta ação não pode ser desfeita.`}
          buttons={[
            { text: 'Cancelar', role: 'cancel' },
            { text: 'Remover', role: 'destructive', handler: handleDelete },
          ]}
        />
      </IonContent>
    </IonPage>
  );
};

export default EmployeeList;
