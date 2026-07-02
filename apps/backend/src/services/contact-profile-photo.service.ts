import { AppError } from '../middleware/error.middleware.js';
import { getContactProfilePhotoUrl } from './saas-whatsapp.service.js';

interface CachedProfilePhoto {
  buffer: Buffer;
  mimeType: string;
  expiresAt: number;
}

const CACHE_TTL_MS = 30 * 60 * 1000;
const photoCache = new Map<string, CachedProfilePhoto>();

function cacheKey(instanceId: string, jid: string): string {
  return `${instanceId}:${jid}`;
}

export async function fetchContactProfilePhoto(
  instanceId: string,
  jid: string,
): Promise<{ buffer: Buffer; mimeType: string } | null> {
  const key = cacheKey(instanceId, jid);
  const cached = photoCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return { buffer: cached.buffer, mimeType: cached.mimeType };
  }

  const photoUrl = await getContactProfilePhotoUrl(instanceId, jid);
  if (!photoUrl) return null;

  let response: Response;
  try {
    response = await fetch(photoUrl, { signal: AbortSignal.timeout(15000) });
  } catch {
    throw new AppError(502, 'Não foi possível carregar a foto de perfil.');
  }

  if (!response.ok) return null;

  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length === 0) return null;

  const mimeType = response.headers.get('content-type') ?? 'image/jpeg';
  photoCache.set(key, {
    buffer,
    mimeType,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });

  return { buffer, mimeType };
}

export function invalidateContactProfilePhotoCache(instanceId: string, jid: string): void {
  photoCache.delete(cacheKey(instanceId, jid));
}
