import type { MessageReply } from '../types/chat';
import { formatQuotedPreview, formatReplyAuthor } from '../utils/reply';

interface MessageQuoteBlockProps {
  reply: MessageReply;
  isSent: boolean;
  contactName?: string;
  contactId?: string;
  senderName?: string;
  isGroup?: boolean;
}

const MessageQuoteBlock: React.FC<MessageQuoteBlockProps> = ({
  reply,
  isSent,
  contactName,
  contactId,
  senderName,
  isGroup,
}) => {
  const author = formatReplyAuthor(reply, { isSent, contactName, contactId, senderName, isGroup });
  const preview = formatQuotedPreview(reply.quotedText, reply.quotedType);

  return (
    <div className="wa-bubble__quote" aria-label="Mensagem citada">
      {author && <div className="wa-bubble__quote-author">{author}</div>}
      <div className="wa-bubble__quote-text">{preview}</div>
    </div>
  );
};

export default MessageQuoteBlock;
