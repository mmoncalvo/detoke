import { Loader2, MessageCircle } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { actionLabel, nextStatuses, type Order, type OrderStatus } from '@shared/orders';
import { api } from '@/api';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { whatsappUrl } from '@/lib/format';

/** Status buttons for the business: the next step, and reject or cancel with confirmation. */
export function OrderActions({ order, onChange, compact }: { order: Order; onChange: (order: Order) => void; compact?: boolean }) {
  const [busy, setBusy] = useState<OrderStatus | null>(null);
  const [closing, setClosing] = useState<'rejected' | 'cancelled' | null>(null);
  const [reason, setReason] = useState('');
  const options = nextStatuses(order.status, order.fulfillment);
  const forward = options.filter((s) => s !== 'rejected' && s !== 'cancelled');
  const stop = options.find((s): s is 'rejected' | 'cancelled' => s === 'rejected' || s === 'cancelled');

  const move = async (status: OrderStatus, why?: string) => {
    setBusy(status);
    try {
      onChange(await api<Order>(`/orders/${order.publicCode}/status`, { method: 'PATCH', body: { status, reason: why || null } }));
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const customerChat = order.customerPhone
    ? whatsappUrl(order.customerPhone, `Hola ${order.customerName.split(' ')[0]}, te escribo por tu pedido #${order.number}.`)
    : null;

  if (options.length === 0 && !customerChat) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {forward.map((status) => (
        <Button key={status} size={compact ? 'sm' : 'default'} onClick={() => move(status)} disabled={!!busy}>
          {busy === status && <Loader2 className="animate-spin" />} {actionLabel(status, order.fulfillment)}
        </Button>
      ))}
      {stop && (
        <Button size={compact ? 'sm' : 'default'} variant="outline" className="text-destructive hover:text-destructive" onClick={() => { setReason(''); setClosing(stop); }} disabled={!!busy}>
          {actionLabel(stop, order.fulfillment)}
        </Button>
      )}
      {customerChat && (
        <Button asChild size={compact ? 'sm' : 'default'} variant="ghost"><a href={customerChat} target="_blank" rel="noreferrer"><MessageCircle /> Escribirle</a></Button>
      )}

      <AlertDialog open={!!closing} onOpenChange={(open) => !open && setClosing(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{closing === 'rejected' ? `¿Rechazar el pedido #${order.number}?` : `¿Cancelar el pedido #${order.number}?`}</AlertDialogTitle>
            <AlertDialogDescription>{order.customerName} lo va a ver en el link del pedido.{closing === 'rejected' && ' Contale el motivo.'}</AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} maxLength={200} placeholder={closing === 'rejected' ? 'Por ejemplo: nos quedamos sin stock' : 'Motivo (opcional)'} aria-label="Motivo" />
          <AlertDialogFooter>
            <AlertDialogCancel>Volver</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              disabled={closing === 'rejected' && !reason.trim()}
              onClick={() => closing && move(closing, reason.trim())}
            >
              {closing && actionLabel(closing, order.fulfillment)}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
