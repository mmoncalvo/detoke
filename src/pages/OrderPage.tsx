import { Bike, CheckCircle2, Circle, MessageCircle, PackageX, Store, XCircle } from 'lucide-react';
import { useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { DELIVERY_LABELS, PAYMENT_LABELS } from '@shared/business';
import { FINAL_STATUSES, STATUS_STEPS, statusLabel, type Order, type OrderView } from '@shared/orders';
import { OrderActions } from '@/components/orders/OrderActions';
import { SafeImage } from '@/components/common/SafeImage';
import { EmptyState, ErrorState } from '@/components/common/States';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useFetch } from '@/hooks/useFetch';
import { useRoom, useSocketEvent } from '@/hooks/useRealtime';
import { useTitle } from '@/hooks/useTitle';
import { formatPrice, whatsappUrl } from '@/lib/format';
import { formatDateTime, statusVariant } from '@/lib/orders';
import { isMobile } from '@/lib/whatsapp';

function Timeline({ order }: { order: Order }) {
  const steps = STATUS_STEPS;
  const reached = new Map(order.statusHistory.map((h) => [h.status, h.at]));
  const stopped = order.status === 'cancelled';
  const last = order.statusHistory.at(-1);

  // Si el pedido saltó directamente a completed (o confirmed) sin pasar por los
  // estados intermedios, se muestra como si hubiera atravesado todo el flujo.
  const currentStepIndex = steps.indexOf(order.status);
  const effectiveSteps = new Set(reached.keys());
  if (currentStepIndex > 0) {
    for (let i = 0; i < currentStepIndex; i++) effectiveSteps.add(steps[i]);
  }

  return (
    <ol className="space-y-0">
      {steps.filter((step) => !stopped || reached.has(step)).map((step, i, shown) => {
        const at = reached.get(step);
        const current = order.status === step;
        const reachedStep = effectiveSteps.has(step);
        const nextReached = i < shown.length - 1 ? effectiveSteps.has(shown[i + 1]) : false;
        return (
          <li key={step} className="relative flex gap-3 pb-5 last:pb-0">
            {i < shown.length - 1 && <span className={`absolute left-[11px] top-6 h-full w-0.5 ${reachedStep && nextReached ? 'bg-primary' : 'bg-border'}`} aria-hidden />}
            {reachedStep ? <CheckCircle2 className={`relative size-6 shrink-0 ${current ? 'text-primary' : 'text-primary/70'}`} /> : <Circle className="relative size-6 shrink-0 text-border" />}
            <div className="min-w-0">
              <p className={current ? 'font-semibold' : reachedStep ? '' : 'text-muted-foreground'}>{statusLabel(step)}</p>
              {at && <p className="text-xs text-muted-foreground">{formatDateTime(at)}</p>}
            </div>
          </li>
        );
      })}
      {stopped && last && (
        <li className="mt-4 flex gap-3 rounded-xl bg-destructive/10 p-3 text-destructive">
          <XCircle className="size-6 shrink-0" />
          <div>
            <p className="font-semibold">{statusLabel(order.status)}</p>
            {last.reason && <p className="text-sm">{last.reason}</p>}
            <p className="text-xs opacity-80">{formatDateTime(last.at)}</p>
          </div>
        </li>
      )}
    </ol>
  );
}

export default function OrderPage() {
  const { code } = useParams();
  const { data: order, setData, error, loading, reload } = useFetch<OrderView>(`/orders/public/${code}`);
  useTitle(order ? `Pedido #${order.number}` : 'Pedido');

  const resync = useCallback(() => reload(), [reload]);
  useRoom('order', code, resync);
  useSocketEvent('order:updated', (updated) => {
    if (updated.publicCode === code) setData((current) => (current ? { ...updated, canManage: current.canManage } : current));
  });

  if (loading && !order) return <div className="mx-auto max-w-form space-y-4 px-4 py-8"><Skeleton className="h-24 w-full" /><Skeleton className="h-72 w-full" /></div>;
  if (error) return <div className="mx-auto max-w-form px-4 py-16">{error.includes('No encontramos') ? <EmptyState icon={PackageX} title="No encontramos ese pedido" description="Revisá que el link esté completo." /> : <ErrorState message={error} onRetry={reload} />}</div>;
  if (!order || !order.business) return null;

  const business = order.business;
  const finished = FINAL_STATUSES.includes(order.status);
  const askBusiness = whatsappUrl(business.whatsapp, `Hola, consulto por mi pedido #${order.number}: ${window.location.href}`);

  return (
    <div className="mx-auto max-w-form px-4 py-8">
      <Link to={`/negocio/${business.slug}`} className="flex items-center gap-3">
        <SafeImage src={business.logo} alt="" className="size-12 rounded-xl" />
        <div>
          <p className="font-semibold hover:underline">{business.name}</p>
          <p className="text-sm text-muted-foreground">Pedido #{order.number} · {formatDateTime(order.createdAt)}</p>
        </div>
      </Link>

      <section className="mt-6 rounded-2xl border bg-card p-5" aria-live="polite">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-2xl font-bold">{statusLabel(order.status)}</h1>
          <Badge variant={statusVariant(order.status)}>{finished ? 'Finalizado' : 'En curso'}</Badge>
        </div>
        {!finished && !order.canManage && <p className="mt-1 text-sm text-muted-foreground">Esta página se actualiza sola cuando el negocio avanza con tu pedido.</p>}
        <div className="mt-5"><Timeline order={order} /></div>
        {order.canManage && !finished && (
          <div className="mt-5 border-t pt-4">
            <p className="mb-2 text-sm font-semibold">Actualizar el estado</p>
            <OrderActions order={order} onChange={(updated) => setData({ ...updated, canManage: true })} />
          </div>
        )}
      </section>

      <section className="mt-4 rounded-2xl border bg-card">
        <ul className="divide-y">
          {order.items.map((item) => (
            <li key={item.productId} className="flex items-center gap-3 px-4 py-3">
              <SafeImage src={item.image} alt="" className="size-11 shrink-0 rounded-lg" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{item.name}</p>
                <p className="text-sm text-muted-foreground">{item.quantity} × {formatPrice(item.unitPrice)}</p>
              </div>
              <p className="text-sm font-medium tabular-nums">{formatPrice(item.subtotal)}</p>
            </li>
          ))}
        </ul>
        <dl className="space-y-1 border-t p-4 text-sm">
          <div className="flex justify-between"><dt className="text-muted-foreground">Subtotal</dt><dd>{formatPrice(order.subtotal)}</dd></div>
          {order.fulfillment === 'delivery' && <div className="flex justify-between"><dt className="text-muted-foreground">Envío</dt><dd>{order.deliveryFee ? formatPrice(order.deliveryFee) : 'Gratis'}</dd></div>}
          <div className="flex justify-between pt-1 text-base font-semibold"><dt>Total</dt><dd>{formatPrice(order.total)}</dd></div>
        </dl>
      </section>

      <section className="mt-4 grid gap-3 rounded-2xl border bg-card p-4 text-sm sm:grid-cols-2">
        <div>
          <p className="flex items-center gap-1.5 font-semibold">{order.fulfillment === 'delivery' ? <Bike className="size-4" /> : <Store className="size-4" />} {DELIVERY_LABELS[order.fulfillment]}</p>
          <p className="text-muted-foreground">{order.fulfillment === 'delivery' ? order.deliveryAddress : business.address ?? 'Coordiná el retiro con el negocio'}</p>
        </div>
        <div>
          <p className="font-semibold">Pago</p>
          <p className="text-muted-foreground">{PAYMENT_LABELS[order.paymentMethod]}</p>
        </div>
        <div>
          <p className="font-semibold">A nombre de</p>
          <p className="text-muted-foreground">{order.customerName}{order.customerPhone && ` · ${order.customerPhone}`}</p>
        </div>
        {order.notes && (
          <div>
            <p className="font-semibold">Aclaraciones</p>
            <p className="text-muted-foreground">{order.notes}</p>
          </div>
        )}
      </section>

      {business.isActive === false && !order.canManage && (
        <p className="mt-4 rounded-xl bg-secondary px-4 py-3 text-sm text-muted-foreground">Este negocio no está disponible en Detoke por ahora. Si tenés dudas sobre el pedido, escribile directamente.</p>
      )}
      {!order.canManage && (
        <Button asChild variant="outline" className="mt-4 w-full"><a href={askBusiness} target={isMobile() ? undefined : '_blank'} rel={isMobile() ? undefined : 'noreferrer'}><MessageCircle /> Escribirle a {business.name}</a></Button>
      )}
    </div>
  );
}
