import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { disablePush, onPushNavigate, registerServiceWorker, syncPush } from '@/lib/push';

/**
 * Keeps this browser's system notifications tied to the session: on sign-in (or a reload) it belongs
 * to the account, and signing out removes it, so a shared device stops hearing about that account.
 * Clicking a notification with Detoke open moves to its page.
 */
export function PushSync() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const previous = useRef<string | null>(null);

  useEffect(() => {
    void registerServiceWorker();
    return onPushNavigate((path) => navigate(path));
  }, [navigate]);

  useEffect(() => {
    if (isLoading) return;
    const id = user?.id ?? null;
    if (id) void syncPush();
    else if (previous.current) void disablePush({ remember: false });
    previous.current = id;
  }, [user?.id, isLoading]);

  return null;
}
