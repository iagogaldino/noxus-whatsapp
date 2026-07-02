import type { WhatsAppApi } from './whatsappApi';
import type { WhatsAppInstance } from '../types/whatsapp';

const MOCK_INSTANCE_ID = 'inst-a1b2c3d4';
const MOCK_INSTANCE_CODE = 'inst-a1b2c3d4';
const QR_DELAY_MS = 3000;
const CONNECT_AFTER_QR_MS = 12000;
const QR_RENEW_MS = 45000;
const PAIRING_TIMEOUT_MS = 90000;

interface InstanceSession {
  instance: WhatsAppInstance;
  pairingStartedAt: number | null;
  qrVisibleAt: number | null;
  qrRenewedAt: number;
  qrToken: number;
  connected: boolean;
}

function delay(ms = 400): Promise<void> {
  const jitter = Math.floor(Math.random() * 400) + 300;
  return new Promise((resolve) => setTimeout(resolve, ms + jitter));
}

function buildQrPayload(token: number): string {
  return `2@${btoa(`noxus-mock-${token}-${Date.now()}`)},noxus-whatsapp,mock-session,1`;
}

class MockWhatsAppApi implements WhatsAppApi {
  private instances: WhatsAppInstance[] = [];
  private sessions = new Map<string, InstanceSession>();

  private getOrCreateSession(instanceId: string): InstanceSession {
    const existing = this.sessions.get(instanceId);
    if (existing) return existing;

    const instance: WhatsAppInstance = {
      id: instanceId,
      code: MOCK_INSTANCE_CODE,
      createdAt: new Date().toISOString(),
    };

    const session: InstanceSession = {
      instance,
      pairingStartedAt: null,
      qrVisibleAt: null,
      qrRenewedAt: 0,
      qrToken: 1,
      connected: false,
    };

    this.sessions.set(instanceId, session);
    if (!this.instances.find((i) => i.id === instanceId)) {
      this.instances.push(instance);
    }

    return session;
  }

  async listInstances(): Promise<WhatsAppInstance[]> {
    await delay();
    if (this.instances.length === 0) {
      return [];
    }
    return [...this.instances];
  }

  async createInstance(): Promise<WhatsAppInstance> {
    await delay();
    const existing = this.instances.find((i) => i.id === MOCK_INSTANCE_ID);
    if (existing) {
      this.getOrCreateSession(existing.id);
      return existing;
    }

    const instance: WhatsAppInstance = {
      id: MOCK_INSTANCE_ID,
      code: MOCK_INSTANCE_CODE,
      createdAt: new Date().toISOString(),
    };

    this.instances.push(instance);
    this.getOrCreateSession(instance.id);
    return instance;
  }

  async startPairing(instanceId: string): Promise<{ alreadyConnected: boolean; statusCode: 200 | 202 }> {
    await delay();
    const session = this.getOrCreateSession(instanceId);

    if (session.connected) {
      return { alreadyConnected: true, statusCode: 200 };
    }

    session.pairingStartedAt = Date.now();
    session.qrVisibleAt = null;
    session.qrRenewedAt = 0;
    session.qrToken = 1;
    session.connected = false;

    return { alreadyConnected: false, statusCode: 202 };
  }

  async getStatus(instanceId: string): Promise<{ whatsappReady: boolean }> {
    await delay(200);
    const session = this.getOrCreateSession(instanceId);

    if (session.connected) {
      return { whatsappReady: true };
    }

    if (!session.pairingStartedAt) {
      return { whatsappReady: false };
    }

    const elapsed = Date.now() - session.pairingStartedAt;
    const qrElapsed = session.qrVisibleAt ? Date.now() - session.qrVisibleAt : 0;

    if (session.qrVisibleAt && qrElapsed >= CONNECT_AFTER_QR_MS) {
      session.connected = true;
      session.pairingStartedAt = null;
      session.qrVisibleAt = null;
      return { whatsappReady: true };
    }

    if (elapsed >= PAIRING_TIMEOUT_MS) {
      return { whatsappReady: false };
    }

    return { whatsappReady: false };
  }

  async getQr(instanceId: string): Promise<{ qr: string | null }> {
    await delay(200);
    const session = this.getOrCreateSession(instanceId);

    if (session.connected || !session.pairingStartedAt) {
      return { qr: null };
    }

    const elapsed = Date.now() - session.pairingStartedAt;
    if (elapsed >= PAIRING_TIMEOUT_MS) {
      return { qr: null };
    }

    if (elapsed < QR_DELAY_MS) {
      return { qr: null };
    }

    if (!session.qrVisibleAt) {
      session.qrVisibleAt = Date.now();
      session.qrRenewedAt = Date.now();
    } else if (Date.now() - session.qrRenewedAt >= QR_RENEW_MS) {
      session.qrToken += 1;
      session.qrRenewedAt = Date.now();
    }

    return { qr: buildQrPayload(session.qrToken) };
  }

  async logout(instanceId: string): Promise<void> {
    await delay();
    const session = this.sessions.get(instanceId);
    if (!session) return;

    session.connected = false;
    session.pairingStartedAt = null;
    session.qrVisibleAt = null;
    session.qrRenewedAt = 0;
  }
}

// TODO: trocar por whatsappApi.http.ts quando integrar com a API real
export const whatsappApi: WhatsAppApi = new MockWhatsAppApi();
