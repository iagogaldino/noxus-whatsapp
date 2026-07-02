import { useEffect, useState } from 'react';
import { API_BASE, getAuthToken } from '../services/apiClient';

export function useAuthenticatedMediaUrl(messageId: string, fallbackUrl?: string): string | null {
  const [src, setSrc] = useState<string | null>(
    fallbackUrl?.startsWith('blob:') ? fallbackUrl : null,
  );

  useEffect(() => {
    if (fallbackUrl?.startsWith('blob:')) {
      setSrc(fallbackUrl);
      return;
    }

    let cancelled = false;
    let objectUrl: string | null = null;

    async function load() {
      const token = getAuthToken();
      if (!token) return;

      try {
        const response = await fetch(
          `${API_BASE}/api/v1/whatsapp/messages/${encodeURIComponent(messageId)}/media`,
          {
            headers: { Authorization: `Bearer ${token}` },
            signal: AbortSignal.timeout(30000),
          },
        );

        if (!response.ok) return;

        const blob = await response.blob();
        objectUrl = URL.createObjectURL(blob);
        if (!cancelled) {
          setSrc(objectUrl);
        }
      } catch {
        // Mantém placeholder quando a mídia não puder ser carregada.
      }
    }

    void load();

    return () => {
      cancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [messageId, fallbackUrl]);

  return src;
}
