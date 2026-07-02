const EMPLOYEES_KEY = 'noxus-employees';
const SESSION_KEY = 'noxus-admin-session';

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
