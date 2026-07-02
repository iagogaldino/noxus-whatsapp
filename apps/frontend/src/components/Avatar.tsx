import { User } from '../types/chat';
import { getInitials } from '../utils/format';
import { useContactAvatarUrl } from '../hooks/useContactAvatarUrl';

interface AvatarProps {
  user: User;
  size?: 'default' | 'medium' | 'large';
}

const sizeClass: Record<NonNullable<AvatarProps['size']>, string> = {
  default: '',
  medium: 'wa-avatar--medium',
  large: 'wa-avatar--large',
};

const Avatar: React.FC<AvatarProps> = ({ user, size = 'default' }) => {
  const fetchedAvatar = useContactAvatarUrl(user.id, user.avatar);
  const src = user.avatar ?? fetchedAvatar;

  return (
    <div
      className={`wa-avatar ${sizeClass[size]}`}
      style={{ backgroundColor: user.avatarColor ?? '#128C7E' }}
      aria-hidden="true"
    >
      {src ? (
        <img
          src={src}
          alt={user.name}
          className="wa-avatar__image"
        />
      ) : (
        getInitials(user.name)
      )}
    </div>
  );
};

export default Avatar;
