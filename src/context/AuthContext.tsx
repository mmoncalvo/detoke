import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import type { Business, Impersonator, Session, User } from '@shared/types';
import { api, ApiError, getAdminToken, getToken, setAdminToken, setToken, setUnauthorizedHandler } from '@/api';

interface AuthState {
  user: User | null;
  business: Business | null;
  /** The admin acting on behalf of `user`, if any. */
  impersonatedBy: Impersonator | null;
  isLoading: boolean;
  signIn: (session: Session) => void;
  signOut: () => void;
  setBusiness: (business: Business) => void;
  startImpersonation: (userId: string) => Promise<void>;
  stopImpersonation: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [impersonatedBy, setImpersonatedBy] = useState<Impersonator | null>(null);
  const [isLoading, setIsLoading] = useState(!!getToken());
  const restoring = useRef<Promise<void> | null>(null);

  const apply = useCallback((session: Omit<Session, 'token'> | null) => {
    setUser(session?.user ?? null);
    setBusiness(session?.business ?? null);
    setImpersonatedBy(session?.impersonatedBy ?? null);
  }, []);

  const signOut = useCallback(() => {
    setToken(null);
    setAdminToken(null);
    apply(null);
  }, [apply]);

  /** Goes back to the admin's own session; `expired` skips telling the server. */
  const restoreAdmin = useCallback((expired: boolean) => {
    // A failing page may trigger this several times: everyone waits for the same restore.
    restoring.current ??= (async () => {
      try {
        if (!expired) await api('/admin/impersonate/stop', { method: 'POST' }).catch(() => undefined);
        const adminToken = getAdminToken();
        setAdminToken(null);
        if (!adminToken) return signOut();
        setToken(adminToken);
        apply(await api<Omit<Session, 'token'>>('/auth/me'));
        if (expired) toast.info('La sesión en nombre del usuario venció. Volviste a tu cuenta.');
      } catch {
        signOut();
      } finally {
        restoring.current = null;
      }
    })();
    return restoring.current;
  }, [apply, signOut]);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      if (getAdminToken()) void restoreAdmin(true);
      else signOut();
    });
    return () => setUnauthorizedHandler(null);
  }, [restoreAdmin, signOut]);

  useEffect(() => {
    if (!getToken()) return;
    api<Omit<Session, 'token'>>('/auth/me')
      .then(apply)
      .catch(async (err) => {
        if (!(err instanceof ApiError && err.status === 401)) return;
        if (getAdminToken() || restoring.current) await restoreAdmin(true);
        else signOut();
      })
      .finally(() => setIsLoading(false));
  }, [apply, signOut, restoreAdmin]);

  const signIn = useCallback((session: Session) => {
    setToken(session.token);
    apply(session);
  }, [apply]);

  const startImpersonation = useCallback(async (userId: string) => {
    const session = await api<Session>(`/admin/impersonate/${userId}`, { method: 'POST' });
    setAdminToken(getToken());
    signIn(session);
  }, [signIn]);

  const stopImpersonation = useCallback(() => restoreAdmin(false), [restoreAdmin]);

  const value = useMemo(
    () => ({ user, business, impersonatedBy, isLoading, signIn, signOut, setBusiness, startImpersonation, stopImpersonation }),
    [user, business, impersonatedBy, isLoading, signIn, signOut, startImpersonation, stopImpersonation],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
