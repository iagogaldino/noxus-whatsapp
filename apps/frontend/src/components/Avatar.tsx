import { User } from '../types/chat';
import { getInitials } from '../utils/format';

interface AvatarProps {
  user: User;
  size?: 'default' | 'medium' | 'large';
}

const sizeClass: Record<NonNullable<AvatarProps['size']>, string> = {
  default: '',
  medium: 'wa-avatar--medium',
  large: 'wa-avatar--large',
};

const Avatar: React.FC<AvatarProps> = ({ user, size = 'default' }) => (
  <div
    className={`wa-avatar ${sizeClass[size]}`}
    style={{ backgroundColor: user.avatarColor ?? '#128C7E' }}
    aria-hidden="true"
  >
    {user.avatar ? (
      <img src={user.avatar} alt={user.name} style={{ width: '100%', height: '100%', borderRadius: '50%' }} />
    ) : (
      getInitials(user.name)
    )}
  </div>
);

export default Avatar;
