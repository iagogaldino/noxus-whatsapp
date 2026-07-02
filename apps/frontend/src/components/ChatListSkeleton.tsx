import Skeleton from './Skeleton';

interface ChatListSkeletonProps {
  count?: number;
}

const ChatListSkeleton: React.FC<ChatListSkeletonProps> = ({ count = 8 }) => (
  <div className="wa-skeleton-list" aria-label="Carregando conversas">
    {Array.from({ length: count }, (_, index) => (
      <div key={index} className="wa-skeleton-chat-item">
        <Skeleton circle width={48} height={48} />
        <div className="wa-skeleton-chat-item__content">
          <div className="wa-skeleton-chat-item__row">
            <Skeleton height={14} className="wa-skeleton-chat-item__name" />
            <Skeleton width={36} height={10} />
          </div>
          <Skeleton height={12} className="wa-skeleton-chat-item__preview" />
        </div>
      </div>
    ))}
  </div>
);

export default ChatListSkeleton;
