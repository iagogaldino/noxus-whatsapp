import { IonButton, IonIcon, IonItem, IonLabel } from '@ionic/react';
import { createOutline, trashOutline } from 'ionicons/icons';
import { formatPhoneLabel } from '../../utils/phone';
import { Employee } from '../types/employee';

interface EmployeeListItemProps {
  employee: Employee;
  onEdit: (id: string) => void;
  onDelete: (employee: Employee) => void;
}

const EmployeeListItem: React.FC<EmployeeListItemProps> = ({ employee, onEdit, onDelete }) => (
  <IonItem className="admin-employee-item" lines="full">
    <div className="admin-employee-item__main">
      <div className="admin-employee-item__name">{employee.name}</div>
      <div className="admin-employee-item__email">{formatPhoneLabel(employee.phone)}</div>
      <div className="admin-employee-item__meta">
        {employee.department && (
          <span className="admin-badge admin-badge--employee">{employee.department}</span>
        )}
        <span className={`admin-badge admin-badge--${employee.role}`}>
          {employee.role === 'admin' ? 'Admin' : 'Funcionário'}
        </span>
        <span className={`admin-badge admin-badge--${employee.status}`}>
          {employee.status === 'active' ? 'Ativo' : 'Inativo'}
        </span>
      </div>
    </div>
    <div className="admin-employee-actions" slot="end">
      <IonButton fill="clear" size="small" onClick={() => onEdit(employee.id)}>
        <IonIcon icon={createOutline} slot="icon-only" />
      </IonButton>
      <IonButton fill="clear" size="small" color="danger" onClick={() => onDelete(employee)}>
        <IonIcon icon={trashOutline} slot="icon-only" />
      </IonButton>
    </div>
    <IonLabel style={{ display: 'none' }}>{employee.name}</IonLabel>
  </IonItem>
);

export default EmployeeListItem;
