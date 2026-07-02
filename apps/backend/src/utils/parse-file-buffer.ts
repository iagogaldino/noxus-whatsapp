export const MAX_MEDIA_SIZE_BYTES = 16 * 1024 * 1024;

export function parseFileBuffer(raw: unknown): Buffer | null {
  if (!raw) return null;

  if (Buffer.isBuffer(raw)) {
    return raw.length > 0 ? raw : null;
  }

  if (raw instanceof Uint8Array) {
    return raw.length > 0 ? Buffer.from(raw) : null;
  }

  if (Array.isArray(raw)) {
    return raw.length > 0 ? Buffer.from(raw) : null;
  }

  if (typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;

    if (obj.type === 'Buffer' && Array.isArray(obj.data)) {
      return obj.data.length > 0 ? Buffer.from(obj.data as number[]) : null;
    }

    if (obj.data instanceof Uint8Array) {
      return obj.data.length > 0 ? Buffer.from(obj.data) : null;
    }

    if (Array.isArray(obj.data)) {
      return obj.data.length > 0 ? Buffer.from(obj.data as number[]) : null;
    }
  }

  return null;
}

export function assertMediaSize(buffer: Buffer): void {
  if (buffer.length > MAX_MEDIA_SIZE_BYTES) {
    throw new Error(`Arquivo excede o limite de ${MAX_MEDIA_SIZE_BYTES} bytes.`);
  }
}
