import Skeleton from './Skeleton';

interface ContactListSkeletonProps {
  count?: number;
}

const ContactListSkeleton: React.FC<ContactListSkeletonProps> = ({ count = 8 }) => (
  <div className="wa-skeleton-list" aria-label="Carregando contatos">
    {Array.from({ length: count }, (_, index) => (
      <div key={index} className="wa-skeleton-chat-item wa-skeleton-chat-item--contact">
        <Skeleton circle width={40} height={40} />
        <div className="wa-skeleton-chat-item__content">
          <Skeleton height={14} className="wa-skeleton-chat-item__name" />
          <Skeleton height={11} width="45%" className="wa-skeleton-chat-item__preview" />
        </div>
      </div>
    ))}
  </div>
);

export default ContactListSkeleton;
