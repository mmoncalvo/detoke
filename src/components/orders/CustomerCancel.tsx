import { Clock, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import type { Order, OrderView } from '@shared/orders';
import { api } from '@/api';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { formatDateTime } from '@/lib/orders';

/** True once the instant has passed; re-renders by itself when it does. */
function useReached(iso: string | null | undefined) {
  const target = iso ? new Date(iso).getTime() : null;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (target == null || now >= target) return;
    // setTimeout overflows past ~24 days: wake up then and check again.
    const timer = setTimeout(() => setNow(Date.now()), Math.min(target - now + 500, 2_000_000_000));
    return () => clearTimeout(timer);
  }, [target, now]);
  return target != null && now >= target;
}

/**
 * For the buyer's account: when the business has not confirmed a new order within 24 hours of
 * its schedule, the buyer can cancel it. Before that, a quiet note says from when.
 */
export function CustomerCancel({ order, onChange }: { order: OrderView; onChange: (order: Order) => void }) {
  const [busy, setBusy] = useState(false);
  const ready = useReached(order.customerCancelFrom);
  if (order.status !== 'pending' || !order.customerCancelFrom) return null;

  const cancel = async () => {
    setBusy(true);
    try {
      onChange(await api<Order>(`/orders/customer/${order.publicCode}/cancel`, { method: 'POST' }));
      toast('Cancelaste el pedido');
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (!ready) {
    return (
      <p className="mt-4 flex items-start gap-2 text-xs text-muted-foreground">
        <Clock className="mt-px size-3.5 shrink-0" />
        Si el negocio no lo confirma, vas a poder cancelarlo desde el {formatDateTime(order.customerCancelFrom)}.
      </p>
    );
  }

  return (
    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-secondary/60 px-4 py-3">
      <p className="text-sm text-muted-foreground">{order.business?.name ?? 'El negocio'} todavía no confirmó tu pedido. Si ya no lo querés, podés cancelarlo.</p>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" disabled={busy}>
            {busy && <Loader2 className="animate-spin" />} Cancelar pedido
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cancelar el pedido #{order.number}?</AlertDialogTitle>
            <AlertDialogDescription>El negocio va a ver que lo cancelaste porque no lo confirmó a tiempo. No se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No, volver</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-white hover:bg-destructive/90" onClick={() => void cancel()}>
              Cancelar pedido
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
