export interface SaasWhatsAppInstance {
  id: string;
  code: string;
  name?: string;
  createdAt: string;
}

export interface SaasPairingStartResponse {
  alreadyConnected: boolean;
  statusCode: 200 | 202;
}

export interface SaasWhatsAppStatusResponse {
  whatsappReady: boolean;
}

export interface SaasWhatsAppQrResponse {
  qr: string | null;
}

export interface SaasWhatsAppContact {
  id: string;
  jid: string;
  phone?: string;
  name?: string;
  notify?: string;
}

export interface SaasConversationMessage {
  id: string;
  jid: string;
  fromMe: boolean;
  timestamp: string;
  text: string;
  type: string;
  mediaUrl?: string;
  mediaMimeType?: string;
}

export interface SaasConversationMessagesResponse {
  items: SaasConversationMessage[];
  nextCursor?: string | null;
}

export interface SaasConversationSummary {
  chatId: string;
  participantName: string;
  lastMessage: SaasConversationMessage;
  assignedSector?: { id: string; name: string } | null;
}

export interface SaasConversationsResponse {
  items: SaasConversationSummary[];
}

export interface SaasIncomingMessageEvent {
  messageId: string;
  from: string;
  to: string | null;
  timestamp: string;
  text: string;
  userId: string;
  instanceId: string;
  jid?: string;
}

export interface SaasSendMessageAck {
  ok?: boolean;
  error?: string;
  messageId?: string;
}
