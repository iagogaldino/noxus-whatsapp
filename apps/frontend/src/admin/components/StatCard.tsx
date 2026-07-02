import { IonIcon } from '@ionic/react';
import {
  checkmarkCircleOutline,
  peopleOutline,
  personOutline,
  shieldOutline,
} from 'ionicons/icons';

export type StatVariant = 'total' | 'active' | 'inactive' | 'admins';

interface StatCardProps {
  label: string;
  value: number;
  variant: StatVariant;
}

const icons: Record<StatVariant, string> = {
  total: peopleOutline,
  active: checkmarkCircleOutline,
  inactive: personOutline,
  admins: shieldOutline,
};

const StatCard: React.FC<StatCardProps> = ({ label, value, variant }) => (
  <div className={`admin-stat-card admin-stat-card--${variant}`}>
    <div className="admin-stat-card__icon">
      <IonIcon icon={icons[variant]} />
    </div>
    <div className="admin-stat-card__body">
      <div className="admin-stat-card__value">{value}</div>
      <div className="admin-stat-card__label">{label}</div>
    </div>
  </div>
);

export default StatCard;
