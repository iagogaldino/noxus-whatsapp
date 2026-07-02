import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { ADMIN_CREDENTIALS, seedEmployees } from '../admin/data/mockEmployees';
import { Employee } from '../admin/types/employee';
import { clearSession, loadEmployees, loadSession, saveSession } from '../admin/utils/storage';
import { AuthSession } from '../types/auth';

interface LoginResult {
  success: boolean;
  error?: string;
  role?: AuthSession['role'];
}

interface AuthContextValue {
  session: AuthSession | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<LoginResult>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function getEmployees(): Employee[] {
  return loadEmployees<Employee[]>() ?? seedEmployees;
}

function findEmployee(email: string, password: string): Employee | undefined {
  const normalizedEmail = email.trim().toLowerCase();
  return getEmployees().find(
    (e) => e.email.toLowerCase() === normalizedEmail && e.password === password,
  );
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<AuthSession | null>(() => loadSession<AuthSession>());

  const login = useCallback(async (email: string, password: string): Promise<LoginResult> => {
    const normalizedEmail = email.trim().toLowerCase();

    if (
      normalizedEmail === ADMIN_CREDENTIALS.email &&
      password === ADMIN_CREDENTIALS.password
    ) {
      const newSession: AuthSession = {
        userId: 'super-admin',
        email: normalizedEmail,
        name: 'Administrador',
        role: 'admin',
        loggedInAt: new Date().toISOString(),
      };
      saveSession(newSession);
      setSession(newSession);
      return { success: true, role: 'admin' };
    }

    const employee = findEmployee(email, password);
    if (!employee) {
      return { success: false, error: 'E-mail ou senha inválidos.' };
    }

    if (employee.status === 'inactive') {
      return { success: false, error: 'Conta inativa. Contate o administrador.' };
    }

    const newSession: AuthSession = {
      userId: employee.id,
      email: employee.email,
      name: employee.name,
      role: employee.role,
      loggedInAt: new Date().toISOString(),
    };
    saveSession(newSession);
    setSession(newSession);
    return { success: true, role: employee.role };
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setSession(null);
  }, []);

  const value = useMemo(
    () => ({
      session,
      isAuthenticated: !!session,
      isAdmin: session?.role === 'admin',
      login,
      logout,
    }),
    [session, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
