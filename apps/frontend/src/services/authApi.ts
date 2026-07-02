import type { AuthLoginResponse, AuthMeResponse } from '../types/auth';

const rawBase = import.meta.env.VITE_API_URL;
const API_BASE = rawBase === undefined ? 'http://localhost:3001' : rawBase;

interface ApiErrorBody {
  error?: string;
}

async function parseError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as ApiErrorBody;
    return body.error ?? 'Erro ao processar solicitação.';
  } catch {
    return 'Erro ao processar solicitação.';
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return response.json() as Promise<T>;
}

export async function login(email: string, password: string): Promise<AuthLoginResponse> {
  return request<AuthLoginResponse>('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function getMe(token: string): Promise<AuthMeResponse> {
  return request<AuthMeResponse>('/api/v1/auth/me', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}
