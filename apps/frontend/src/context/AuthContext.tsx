import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { clearSession, loadSession, saveSession } from '../admin/utils/storage';
import * as authApi from '../services/authApi';
import { AuthSession, AuthUser } from '../types/auth';

interface LoginResult {
  success: boolean;
  error?: string;
  role?: AuthSession['role'];
}

interface AuthContextValue {
  session: AuthSession | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<LoginResult>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function buildSession(token: string, user: AuthUser): AuthSession {
  return {
    token,
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    loggedInAt: new Date().toISOString(),
  };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      const stored = loadSession<AuthSession>();

      if (!stored?.token) {
        if (!cancelled) {
          setSession(null);
          setIsLoading(false);
        }
        return;
      }

      try {
        const { user } = await authApi.getMe(stored.token);

        if (!cancelled) {
          const restored = buildSession(stored.token, user);
          saveSession(restored);
          setSession(restored);
        }
      } catch {
        clearSession();
        if (!cancelled) {
          setSession(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void restoreSession();

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<LoginResult> => {
    try {
      const { token, user } = await authApi.login(email, password);
      const newSession = buildSession(token, user);
      saveSession(newSession);
      setSession(newSession);
      return { success: true, role: user.role };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao entrar.';
      return { success: false, error: message };
    }
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
      isLoading,
      login,
      logout,
    }),
    [session, isLoading, login, logout],
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
