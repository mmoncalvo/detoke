import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import type { User } from '@shared/types';
import { api } from '@/api';
import { useAuth } from '@/context/AuthContext';
import { disablePush, enablePush, pushState, testPush, readLocalPreference, writeLocalPreference, type PushState } from '@/lib/push';

/**
 * Whether the person wants system notifications: in the account when signed in (it follows them to
 * every device), in this browser otherwise. Null until they choose. An admin acting as someone else
 * changes nothing.
 */
export function useNotificationPreference() {
  const { user, impersonatedBy, setUser } = useAuth();
  const [local, setLocal] = useState(readLocalPreference);
  const preference = user ? user.notifications ?? null : local;

  const setPreference = useCallback(async (on: boolean) => {
    if (impersonatedBy) return;
    if (!user) {
      writeLocalPreference(on);
      setLocal(on);
      return;
    }
    try {
      setUser(await api<User>('/auth/me/notifications', { method: 'PUT', body: { enabled: on } }));
    } catch {
      toast.error('No pudimos guardar la preferencia en tu cuenta');
    }
  }, [user, impersonatedBy, setUser]);

  return { preference, setPreference };
}

/** This browser's notification state, the saved preference, and the actions (enable must run in a click). */
export function usePush() {
  const [state, setState] = useState<PushState | null>(null);
  const [busy, setBusy] = useState(false);
  const { preference, setPreference } = useNotificationPreference();

  useEffect(() => {
    let alive = true;
    void pushState().then((s) => alive && setState(s));
    return () => {
      alive = false;
    };
  }, []);

  const enable = useCallback(async (orderCode?: string) => {
    setBusy(true);
    try {
      const next = await enablePush(orderCode);
      setState(next);
      if (next === 'on') await setPreference(true);
      if (next === 'denied') toast.error('El navegador bloqueó las notificaciones. Podés habilitarlas desde la configuración del sitio.');
      return next;
    } catch {
      toast.error('No pudimos activar las notificaciones en este navegador');
      return 'off' as const;
    } finally {
      setBusy(false);
    }
  }, [setPreference]);

  const disable = useCallback(async () => {
    setBusy(true);
    try {
      await disablePush();
      setState('off');
      await setPreference(false);
    } finally {
      setBusy(false);
    }
  }, [setPreference]);

  const test = useCallback(async () => {
    setBusy(true);
    try {
      await testPush();
      toast.success('Te mandamos una notificación de prueba. Si no la ves, revisá que el sistema permita las notificaciones del navegador.');
    } catch (err) {
      toast.error((err as Error).message || 'No pudimos enviar la notificación de prueba');
    } finally {
      setBusy(false);
    }
  }, []);

  return { state, setState, busy, enable, disable, test, preference };
}
