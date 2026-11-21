import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { disablePush, enablePush, pushState, type PushState } from '@/lib/push';

/** This browser's notification state, and the actions to change it (enable must run in a click). */
export function usePush() {
  const [state, setState] = useState<PushState | null>(null);
  const [busy, setBusy] = useState(false);

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
      if (next === 'denied') toast.error('El navegador bloqueó las notificaciones. Podés habilitarlas desde la configuración del sitio.');
      return next;
    } catch {
      toast.error('No pudimos activar las notificaciones en este navegador');
      return 'off' as const;
    } finally {
      setBusy(false);
    }
  }, []);

  const disable = useCallback(async () => {
    setBusy(true);
    try {
      await disablePush();
      setState('off');
    } finally {
      setBusy(false);
    }
  }, []);

  return { state, busy, enable, disable };
}
