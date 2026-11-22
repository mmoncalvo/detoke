import { Bell, BellRing, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/context/AuthContext';
import { usePush } from '@/hooks/usePush';
import { syncPush } from '@/lib/push';

// Orders whose prompt the person already closed in this tab, so it does not come back on every visit.
const ASKED_KEY = 'detoke.notificationsAsked';

function wasAsked(code: string) {
  try {
    return (JSON.parse(sessionStorage.getItem(ASKED_KEY) ?? '[]') as string[]).includes(code);
  } catch {
    return false;
  }
}

function markAsked(code: string) {
  try {
    const list = JSON.parse(sessionStorage.getItem(ASKED_KEY) ?? '[]') as string[];
    sessionStorage.setItem(ASKED_KEY, JSON.stringify([...list.filter((c) => c !== code), code].slice(-20)));
  } catch {
    /* storage not available */
  }
}

/**
 * On the order page, for the customer. With notifications on (and wanted), it follows the order on its
 * own and says so. Otherwise a modal asks to turn them on, unless the person said no in Mi cuenta,
 * the browser blocks them, or the modal was already closed for this order in this tab. While they are
 * off, a bell next to the business name opens the modal again.
 */
export function useOrderNotifications(code: string, enabled: boolean) {
  const push = usePush();
  const { setState } = push;
  const [following, setFollowing] = useState(false);
  const [open, setOpen] = useState(false);
  const wanted = push.preference !== false;
  const available = enabled && !!push.state && push.state !== 'unsupported' && push.state !== 'denied';

  useEffect(() => {
    if (!available || !wanted) return;
    let alive = true;
    // Allowed already: follow this order without asking. Otherwise, ask.
    void syncPush(code).then((ok) => {
      if (!alive) return;
      if (ok) {
        setFollowing(true);
        setState('on');
      } else if (!wasAsked(code)) setOpen(true);
    });
    return () => {
      alive = false;
    };
  }, [code, available, wanted]); // eslint-disable-line react-hooks/exhaustive-deps

  const close = () => {
    markAsked(code);
    setOpen(false);
  };

  const activate = async () => {
    const result = await push.enable(code);
    if (result === 'on') setFollowing(true);
    close();
  };

  return { following: available && following, showBell: available && !following, open, ask: () => setOpen(true), close, activate, busy: push.busy };
}

type OrderNotificationsState = ReturnType<typeof useOrderNotifications>;

/** Next to the business name while notifications are off: opens the modal on demand. */
export function OrderNotificationsBell({ state }: { state: OrderNotificationsState }) {
  if (!state.showBell) return null;
  return (
    <Button type="button" variant="link" size="icon" className="ml-auto shrink-0 rounded-full text-foreground items-end" onClick={state.ask} aria-label="Activar notificaciones del pedido" title="Activar notificaciones">
      <Bell className='text-muted-foreground size-5' />
    </Button>
  );
}

/** The confirmation line, and the modal. */
export function OrderNotifications({ state, number, businessName }: { state: OrderNotificationsState; number: number; businessName: string }) {
  const { user } = useAuth();
  const { following, open, close, activate, busy } = state;
  return (
    <>
      {following && (
        <p className="my-6 mb-0 flex items-center gap-4 px-2 text-sm text-muted-foreground font-semibold">
          <BellRing className="size-4 shrink-0 text-primary" /> Te vamos a avisar con una notificación cuando cambie el estado.
        </p>
      )}
      <Dialog open={open} onOpenChange={(next) => !next && close()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-center gap-3 sm:justify-start">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"><BellRing className="size-5" /></span>
              Activá las notificaciones
            </DialogTitle>
            <DialogDescription className='my-4 mt-2 !leading-6'>
              Te avisamos cuando {businessName} confirme, finalice o cancele tu pedido #{number}, aunque cierres esta página.
              {user ? ' Podés cambiarlo cuando quieras desde Mi cuenta.' : ''}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={close}>Ahora no</Button>
            <Button type="button" disabled={busy} onClick={() => void activate()}>
              {busy && <Loader2 className="animate-spin" />} Activar notificaciones
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
