import Skeleton from './Skeleton';

interface MessageListSkeletonProps {
  count?: number;
}

const MessageListSkeleton: React.FC<MessageListSkeletonProps> = ({ count = 7 }) => (
  <div className="wa-message-list wa-skeleton-message-list" aria-label="Carregando mensagens">
    {Array.from({ length: count }, (_, index) => {
      const isSent = index % 3 !== 0;
      const widths = ['58%', '42%', '70%', '36%', '64%', '48%', '52%'];

      return (
        <div
          key={index}
          className={`wa-message-row wa-skeleton-message-row ${isSent ? 'wa-message-row--sent' : 'wa-message-row--received'}`}
        >
          <div className={`wa-skeleton-message-bubble ${isSent ? 'wa-skeleton-message-bubble--sent' : 'wa-skeleton-message-bubble--received'}`}>
            <Skeleton height={12} width={widths[index % widths.length]} />
            {index % 2 === 0 && <Skeleton height={12} width="75%" className="wa-skeleton-message-bubble__line" />}
            <div className="wa-skeleton-message-bubble__meta">
              <Skeleton width={28} height={8} />
            </div>
          </div>
        </div>
      );
    })}
  </div>
);

export default MessageListSkeleton;
