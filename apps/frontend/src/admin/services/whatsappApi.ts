import type {
  PairingStartResponse,
  WhatsAppInstance,
  WhatsAppQrResponse,
  WhatsAppStatusResponse,
} from '../types/whatsapp';

export interface WhatsAppApi {
  listInstances(): Promise<WhatsAppInstance[]>;
  createInstance(): Promise<WhatsAppInstance>;
  startPairing(instanceId: string): Promise<PairingStartResponse>;
  getStatus(instanceId: string): Promise<WhatsAppStatusResponse>;
  getQr(instanceId: string): Promise<WhatsAppQrResponse>;
  logout(instanceId: string): Promise<void>;
}
