import type { WhatsAppApi } from './whatsappApi';
import type {
  PairingStartResponse,
  WhatsAppInstance,
  WhatsAppQrResponse,
  WhatsAppStatusResponse,
} from '../types/whatsapp';
import { authRequest } from '../../services/apiClient';

const BASE = '/api/v1/whatsapp/instances';

class HttpWhatsAppApi implements WhatsAppApi {
  async listInstances(): Promise<WhatsAppInstance[]> {
    return authRequest<WhatsAppInstance[]>(BASE);
  }

  async createInstance(): Promise<WhatsAppInstance> {
    return authRequest<WhatsAppInstance>(BASE, {
      method: 'POST',
      body: JSON.stringify({ name: 'Noxus WhatsApp' }),
    });
  }

  async startPairing(instanceId: string): Promise<PairingStartResponse> {
    return authRequest<PairingStartResponse>(`${BASE}/${encodeURIComponent(instanceId)}/pairing/start`, {
      method: 'POST',
    });
  }

  async getStatus(instanceId: string): Promise<WhatsAppStatusResponse> {
    return authRequest<WhatsAppStatusResponse>(`${BASE}/${encodeURIComponent(instanceId)}/status`);
  }

  async getQr(instanceId: string): Promise<WhatsAppQrResponse> {
    return authRequest<WhatsAppQrResponse>(`${BASE}/${encodeURIComponent(instanceId)}/qr`);
  }

  async logout(instanceId: string): Promise<void> {
    await authRequest<void>(`${BASE}/${encodeURIComponent(instanceId)}/logout`, {
      method: 'POST',
    });
  }
}

export const whatsappApi: WhatsAppApi = new HttpWhatsAppApi();
