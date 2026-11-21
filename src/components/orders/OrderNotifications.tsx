import { Bell, BellRing, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { usePush } from '@/hooks/usePush';
import { syncPush } from '@/lib/push';

/**
 * On the order page, for the customer: follows the order with system notifications, so they hear
 * when the business confirms, finishes or cancels it even with Detoke closed. Where notifications
 * are already allowed it follows on its own; otherwise it offers a button.
 */
export function OrderNotifications({ code }: { code: string }) {
  const push = usePush();
  const [following, setFollowing] = useState(false);

  useEffect(() => {
    let alive = true;
    void syncPush(code).then((ok) => alive && ok && setFollowing(true));
    return () => {
      alive = false;
    };
  }, [code]);

  if (!push.state || push.state === 'unsupported' || push.state === 'denied') return null;

  if (following || push.state === 'on') {
    return (
      <p className="mt-4 flex items-center gap-2 rounded-xl bg-muted px-3 py-2 text-sm text-muted-foreground">
        <BellRing className="size-4 shrink-0 text-primary" /> Te vamos a avisar con una notificación cuando cambie el estado.
      </p>
    );
  }

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed px-3 py-2.5">
      <p className="flex items-center gap-2 text-sm">
        <Bell className="size-4 shrink-0 text-muted-foreground" /> ¿Querés enterarte aunque cierres esta página?
      </p>
      <Button type="button" size="sm" variant="outline" disabled={push.busy} onClick={() => void push.enable(code).then((s) => s === 'on' && setFollowing(true))}>
        {push.busy && <Loader2 className="animate-spin" />} Avisarme
      </Button>
    </div>
  );
}
