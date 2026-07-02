import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { whatsappApi } from '../services/whatsappApi.mock';
import type { WhatsAppConnectionStatus } from '../types/whatsapp';
import {
  clearWhatsAppConnection,
  loadWhatsAppConnection,
  saveWhatsAppConnection,
} from '../utils/storage';

const POLL_INTERVAL_MS = 1500;
const PAIRING_TIMEOUT_MS = 90000;

interface PersistedConnection {
  instanceId: string;
  instanceCode: string;
  status: 'connected';
}

interface WhatsAppConnectionContextValue {
  instanceId: string | null;
  instanceCode: string | null;
  status: WhatsAppConnectionStatus;
  qrPayload: string | null;
  error: string | null;
  isPolling: boolean;
  isModalOpen: boolean;
  startPairing: () => Promise<void>;
  stopPairing: () => void;
  logout: () => Promise<void>;
  openModal: () => void;
  closeModal: () => void;
}

const WhatsAppConnectionContext = createContext<WhatsAppConnectionContextValue | null>(null);

function loadPersisted(): PersistedConnection | null {
  const stored = loadWhatsAppConnection<PersistedConnection>();
  if (stored?.status === 'connected' && stored.instanceId) {
    return stored;
  }
  return null;
}

export const WhatsAppConnectionProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const persisted = loadPersisted();
  const [instanceId, setInstanceId] = useState<string | null>(persisted?.instanceId ?? null);
  const [instanceCode, setInstanceCode] = useState<string | null>(persisted?.instanceCode ?? null);
  const [status, setStatus] = useState<WhatsAppConnectionStatus>(
    persisted ? 'connected' : 'idle',
  );
  const [qrPayload, setQrPayload] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pairingStartedAtRef = useRef<number | null>(null);
  const activeInstanceRef = useRef<string | null>(null);

  const clearPoll = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    setIsPolling(false);
    pairingStartedAtRef.current = null;
    activeInstanceRef.current = null;
  }, []);

  const persistConnected = useCallback((id: string, code: string) => {
    saveWhatsAppConnection<PersistedConnection>({
      instanceId: id,
      instanceCode: code,
      status: 'connected',
    });
  }, []);

  const pollOnce = useCallback(
    async (id: string) => {
      const [statusRes, qrRes] = await Promise.all([
        whatsappApi.getStatus(id),
        whatsappApi.getQr(id),
      ]);

      if (statusRes.whatsappReady) {
        clearPoll();
        setQrPayload(null);
        setError(null);
        setStatus('connected');
        setInstanceId(id);
        const instances = await whatsappApi.listInstances();
        const instance = instances.find((i) => i.id === id);
        const code = instance?.code ?? id;
        setInstanceCode(code);
        persistConnected(id, code);
        return;
      }

      if (pairingStartedAtRef.current) {
        const elapsed = Date.now() - pairingStartedAtRef.current;
        if (elapsed >= PAIRING_TIMEOUT_MS) {
          clearPoll();
          setQrPayload(null);
          setStatus('error');
          setError('Tempo esgotado. Tente novamente.');
        }
      }

      setQrPayload(qrRes.qr);
    },
    [clearPoll, persistConnected],
  );

  const startPolling = useCallback(
    (id: string) => {
      clearPoll();
      activeInstanceRef.current = id;
      pairingStartedAtRef.current = Date.now();
      setIsPolling(true);

      void pollOnce(id);

      pollRef.current = setInterval(() => {
        if (activeInstanceRef.current) {
          void pollOnce(activeInstanceRef.current);
        }
      }, POLL_INTERVAL_MS);
    },
    [clearPoll, pollOnce],
  );

  const resolveInstance = useCallback(async (): Promise<string> => {
    const existing = await whatsappApi.listInstances();
    if (existing.length > 0) {
      return existing[0].id;
    }
    const created = await whatsappApi.createInstance();
    return created.id;
  }, []);

  const startPairing = useCallback(async () => {
    setError(null);
    setQrPayload(null);
    setStatus('pairing');
    setIsModalOpen(true);

    try {
      const id = await resolveInstance();
      setInstanceId(id);

      const startRes = await whatsappApi.startPairing(id);

      if (startRes.alreadyConnected) {
        const instances = await whatsappApi.listInstances();
        const instance = instances.find((i) => i.id === id);
        const code = instance?.code ?? id;
        setInstanceCode(code);
        setStatus('connected');
        setQrPayload(null);
        persistConnected(id, code);
        return;
      }

      startPolling(id);
    } catch {
      setStatus('error');
      setError('Não foi possível iniciar o pareamento. Tente novamente.');
      clearPoll();
    }
  }, [clearPoll, persistConnected, resolveInstance, startPolling]);

  const stopPairing = useCallback(() => {
    clearPoll();
    setQrPayload(null);
    if (status !== 'connected') {
      setStatus('idle');
      setError(null);
    }
  }, [clearPoll, status]);

  const logout = useCallback(async () => {
    clearPoll();
    setQrPayload(null);
    setError(null);

    if (instanceId) {
      try {
        await whatsappApi.logout(instanceId);
      } catch {
        // ignore mock errors on logout
      }
    }

    clearWhatsAppConnection();
    setInstanceId(null);
    setInstanceCode(null);
    setStatus('idle');
    setIsModalOpen(false);
  }, [clearPoll, instanceId]);

  const openModal = useCallback(() => {
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    if (status === 'pairing') {
      stopPairing();
    }
  }, [status, stopPairing]);

  useEffect(() => () => clearPoll(), [clearPoll]);

  const value = useMemo(
    () => ({
      instanceId,
      instanceCode,
      status,
      qrPayload,
      error,
      isPolling,
      isModalOpen,
      startPairing,
      stopPairing,
      logout,
      openModal,
      closeModal,
    }),
    [
      instanceId,
      instanceCode,
      status,
      qrPayload,
      error,
      isPolling,
      isModalOpen,
      startPairing,
      stopPairing,
      logout,
      openModal,
      closeModal,
    ],
  );

  return (
    <WhatsAppConnectionContext.Provider value={value}>
      {children}
    </WhatsAppConnectionContext.Provider>
  );
};

export const useWhatsAppConnection = (): WhatsAppConnectionContextValue => {
  const context = useContext(WhatsAppConnectionContext);
  if (!context) {
    throw new Error('useWhatsAppConnection must be used within WhatsAppConnectionProvider');
  }
  return context;
};
