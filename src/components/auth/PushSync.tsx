import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import type { User } from '@shared/types';
import { api } from '@/api';
import { useAuth } from '@/context/AuthContext';
import { disablePush, onPushNavigate, readLocalPreference, registerServiceWorker, syncPush } from '@/lib/push';

/**
 * Keeps this browser's system notifications in line with the session and the saved preference: on
 * sign-in it belongs to the account if the account wants them (and stops if it does not), and signing
 * out removes it, so a shared device stops hearing about that account. A visitor's choice becomes the
 * account's when the account had none. Clicking a notification with Detoke open moves to its page.
 */
export function PushSync() {
  const { user, impersonatedBy, isLoading, setUser } = useAuth();
  const navigate = useNavigate();
  const previous = useRef<string | null>(null);

  useEffect(() => {
    void registerServiceWorker();
    return onPushNavigate((path) => navigate(path));
  }, [navigate]);

  const id = user?.id ?? null;
  const wants = user ? user.notifications ?? null : null;
  useEffect(() => {
    if (isLoading) return;
    const signedOut = !id && previous.current;
    previous.current = id;
    if (signedOut) {
      void disablePush();
      return;
    }
    if (!id) {
      if (readLocalPreference()) void syncPush();
      return;
    }
    const local = readLocalPreference();
    if (wants === null && local !== null && !impersonatedBy) {
      void api<User>('/auth/me/notifications', { method: 'PUT', body: { enabled: local } }).then(setUser).catch(() => undefined);
      return;
    }
    if (wants === true) void syncPush();
    else if (wants === false) void disablePush();
  }, [id, wants, isLoading, impersonatedBy, setUser]);

  return null;
}
