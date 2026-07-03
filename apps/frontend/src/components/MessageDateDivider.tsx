interface MessageDateDividerProps {
  label: string;
}

const MessageDateDivider: React.FC<MessageDateDividerProps> = ({ label }) => (
  <div className="wa-date-divider" role="separator" aria-label={label}>
    <span className="wa-date-divider__label">{label}</span>
  </div>
);

export default MessageDateDivider;
