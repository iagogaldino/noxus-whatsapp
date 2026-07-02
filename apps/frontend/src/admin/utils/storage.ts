const EMPLOYEES_KEY = 'noxus-employees';
const SESSION_KEY = 'noxus-admin-session';
const WHATSAPP_CONNECTION_KEY = 'noxus-whatsapp-connection';

export function loadEmployees<T>(): T | null {
  try {
    const raw = localStorage.getItem(EMPLOYEES_KEY);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function saveEmployees<T>(data: T): void {
  localStorage.setItem(EMPLOYEES_KEY, JSON.stringify(data));
}

export function loadSession<T>(): T | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function saveSession<T>(data: T): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(data));
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
}

export function loadWhatsAppConnection<T>(): T | null {
  try {
    const raw = localStorage.getItem(WHATSAPP_CONNECTION_KEY);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function saveWhatsAppConnection<T>(data: T): void {
  localStorage.setItem(WHATSAPP_CONNECTION_KEY, JSON.stringify(data));
}

export function clearWhatsAppConnection(): void {
  localStorage.removeItem(WHATSAPP_CONNECTION_KEY);
}
