export type WhatsAppConnectionStatus = 'idle' | 'pairing' | 'connected' | 'error';

export interface WhatsAppInstance {
  id: string;
  code: string;
  createdAt: string;
}

export interface PairingStartResponse {
  alreadyConnected: boolean;
  statusCode: 200 | 202;
}

export interface WhatsAppStatusResponse {
  whatsappReady: boolean;
}

export interface WhatsAppQrResponse {
  qr: string | null;
}

export interface WhatsAppConnectionState {
  instanceId: string | null;
  instanceCode: string | null;
  status: WhatsAppConnectionStatus;
  error: string | null;
}
