import { loadSession } from '../admin/utils/storage';
import type { AuthSession } from '../types/auth';

const rawBase = import.meta.env.VITE_API_URL;
export const API_BASE = rawBase === undefined ? 'http://localhost:3001' : rawBase;

interface ApiErrorBody {
  error?: string;
}

export function getAuthToken(): string | null {
  const session = loadSession<AuthSession>();
  return session?.token ?? null;
}

export async function parseError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as ApiErrorBody;
    return body.error ?? 'Erro ao processar solicitação.';
  } catch {
    return 'Erro ao processar solicitação.';
  }
}

export async function authRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Não autenticado.');
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}
