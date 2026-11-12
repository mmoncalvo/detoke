import { Loader2, MessageCircle } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { actionLabel, nextStatuses, type Order, type OrderStatus } from '@shared/orders';
import { api } from '@/api';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { whatsappUrl } from '@/lib/format';
import { whatsappLinkProps } from '@/lib/whatsapp';

/** Status buttons for the business: the next step, and reject or cancel with confirmation. */
export function OrderActions({ order, onChange, compact }: { order: Order; onChange: (order: Order) => void; compact?: boolean }) {
  const [busy, setBusy] = useState<OrderStatus | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState('');
  const options = nextStatuses(order.status);
  // One main action: confirm a new order, deliver a confirmed one.
  const main = options.find((s) => s !== 'cancelled' && (order.status !== 'pending' || s === 'confirmed'));
  const canCancel = options.includes('cancelled');

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
      {main && (
        <Button size={compact ? 'sm' : 'default'} onClick={() => move(main)} disabled={!!busy}>
          {busy === main && <Loader2 className="animate-spin" />} {actionLabel(main)}
        </Button>
      )}
      {order.status === 'pending' && (
        <Button size={compact ? 'sm' : 'default'} variant="outline" onClick={() => move('completed')} disabled={!!busy}>
          {busy === 'completed' && <Loader2 className="animate-spin" />} Finalizar ya
        </Button>
      )}
      {canCancel && (
        <Button size={compact ? 'sm' : 'default'} variant="ghost" className="text-destructive hover:text-destructive" onClick={() => { setReason(''); setCancelling(true); }} disabled={!!busy}>
          Cancelar
        </Button>
      )}
      {customerChat && (
        <Button asChild size={compact ? 'sm' : 'default'} variant="ghost"><a href={customerChat} {...whatsappLinkProps()}><MessageCircle /> Escribirle</a></Button>
      )}

      <AlertDialog open={cancelling} onOpenChange={setCancelling}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cancelar el pedido #{order.number}?</AlertDialogTitle>
            <AlertDialogDescription>{order.customerName} lo va a ver en el link del pedido. Si querés, contale el motivo.</AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} maxLength={200} placeholder="Por ejemplo: nos quedamos sin stock (opcional)" aria-label="Motivo" />
          <AlertDialogFooter>
            <AlertDialogCancel>No, volver</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => move('cancelled', reason.trim())}
            >
              Cancelar pedido
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
