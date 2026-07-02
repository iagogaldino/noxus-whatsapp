import { useEffect, useState } from 'react';
import { API_BASE, getAuthToken } from '../services/apiClient';
import { isValidWhatsAppPhone, normalizePhoneInput } from '../utils/phone';

const avatarCache = new Map<string, string>();
const inflightRequests = new Map<string, Promise<string | null>>();

export function canFetchContactProfilePhoto(contactId?: string): boolean {
  if (!contactId?.trim()) return false;
  if (contactId.startsWith('name:')) return false;
  if (contactId.includes('@g.us')) return true;
  return isValidWhatsAppPhone(contactId);
}

function resolveProfilePhotoJid(contactId: string): string {
  if (contactId.includes('@')) return contactId;
  return normalizePhoneInput(contactId) || contactId;
}

async function fetchContactAvatarBlob(contactId: string): Promise<string | null> {
  const cached = avatarCache.get(contactId);
  if (cached) return cached;

  const existing = inflightRequests.get(contactId);
  if (existing) return existing;

  const request = (async () => {
    const token = getAuthToken();
    if (!token) return null;

    const jid = resolveProfilePhotoJid(contactId);
    try {
      const response = await fetch(
        `${API_BASE}/api/v1/whatsapp/contacts/${encodeURIComponent(jid)}/profile-photo`,
        {
          headers: { Authorization: `Bearer ${token}` },
          signal: AbortSignal.timeout(15000),
        },
      );

      if (!response.ok) return null;

      const blob = await response.blob();
      if (!blob.size) return null;

      const objectUrl = URL.createObjectURL(blob);
      avatarCache.set(contactId, objectUrl);
      return objectUrl;
    } catch {
      return null;
    } finally {
      inflightRequests.delete(contactId);
    }
  })();

  inflightRequests.set(contactId, request);
  return request;
}

export function useContactAvatarUrl(contactId?: string, explicitAvatar?: string): string | null {
  const [src, setSrc] = useState<string | null>(
    explicitAvatar?.trim() ? explicitAvatar : avatarCache.get(contactId ?? '') ?? null,
  );

  useEffect(() => {
    if (explicitAvatar?.trim()) {
      setSrc(explicitAvatar);
      return;
    }

    if (!contactId || !canFetchContactProfilePhoto(contactId)) {
      setSrc(null);
      return;
    }

    let cancelled = false;

    void fetchContactAvatarBlob(contactId).then((objectUrl) => {
      if (!cancelled) {
        setSrc(objectUrl);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [contactId, explicitAvatar]);

  return src;
}

export function clearContactAvatarCache(): void {
  for (const objectUrl of avatarCache.values()) {
    URL.revokeObjectURL(objectUrl);
  }
  avatarCache.clear();
  inflightRequests.clear();
}
