import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Business, Session, User } from '@shared/types';
import { api, ApiError, getToken, setToken } from '@/api';

interface AuthState {
  user: User | null;
  business: Business | null;
  isLoading: boolean;
  signIn: (session: Session) => void;
  signOut: () => void;
  setBusiness: (business: Business) => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [isLoading, setIsLoading] = useState(!!getToken());

  useEffect(() => {
    if (!getToken()) return;
    api<Omit<Session, 'token'>>('/auth/me')
      .then((session) => {
        setUser(session.user);
        setBusiness(session.business);
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) setToken(null);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const signIn = useCallback((session: Session) => {
    setToken(session.token);
    setUser(session.user);
    setBusiness(session.business);
  }, []);

  const signOut = useCallback(() => {
    setToken(null);
    setUser(null);
    setBusiness(null);
  }, []);

  const value = useMemo(() => ({ user, business, isLoading, signIn, signOut, setBusiness }), [user, business, isLoading, signIn, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
