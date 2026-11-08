import { Bell, BellOff, Bike, ChevronRight, Inbox, Store } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PAYMENT_LABELS } from '@shared/business';
import { ORDER_STATUSES, statusLabel, type Order, type OrderStatus } from '@shared/orders';
import { EmptyState, ErrorState } from '@/components/common/States';
import { OrderActions } from '@/components/orders/OrderActions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/context/AuthContext';
import { useFetch } from '@/hooks/useFetch';
import { readSoundPreference, saveSoundPreference } from '@/hooks/useOrderAlerts';
import { useSocketEvent } from '@/hooks/useRealtime';
import { useTitle } from '@/hooks/useTitle';
import { useUrlState } from '@/hooks/useUrlState';
import { formatPrice } from '@/lib/format';
import { itemsSummary, statusVariant, timeAgo } from '@/lib/orders';

const ALL = 'all';

/** Tab labels: plural of each status, same order as the flow. */
const TAB_LABELS: Record<OrderStatus | typeof ALL, string> = {
  all: 'Todos',
  pending: 'Nuevos',
  confirmed: 'Confirmados',
  completed: 'Entregados',
  cancelled: 'Cancelados',
};

const PERIODS: Record<string, { label: string; days: number | null }> = {
  today: { label: 'Hoy', days: 0 },
  week: { label: 'Últimos 7 días', days: 7 },
  month: { label: 'Últimos 30 días', days: 30 },
  all: { label: 'Todo', days: null },
};

function since(days: number | null) {
  if (days === null) return null;
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

function OrderCard({ order, onChange, dimmed = false }: { order: Order; onChange: (order: Order) => void; dimmed?: boolean }) {
  return (
    <article className={`rounded-2xl border bg-card p-4 transition-opacity duration-200 ${order.status === 'pending' && !dimmed ? 'border-warning/70 shadow-sm' : ''} ${dimmed ? 'opacity-40 hover:opacity-100 focus-within:opacity-100' : ''}`}>
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold">Pedido #{order.number} · {order.customerName}</p>
          <p className="text-xs text-muted-foreground">{timeAgo(order.createdAt)}</p>
        </div>
        <Badge variant={statusVariant(order.status)}>{statusLabel(order.status, 'business')}</Badge>
      </header>
      <p className="mt-3 text-sm">{itemsSummary(order)}</p>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
        <span className="flex items-center gap-1">{order.fulfillment === 'delivery' ? <Bike className="size-4" /> : <Store className="size-4" />}{order.fulfillment === 'delivery' ? order.deliveryAddress : 'Retira en el local'}</span>
        <span>{PAYMENT_LABELS[order.paymentMethod]}</span>
        <span className="font-semibold text-foreground">{formatPrice(order.total)}</span>
      </div>
      {order.notes && <p className="mt-2 rounded-lg bg-secondary px-3 py-2 text-sm">“{order.notes}”</p>}
      {order.status === 'cancelled' && order.statusHistory.at(-1)?.reason && <p className="mt-2 text-sm text-destructive">Motivo: {order.statusHistory.at(-1)?.reason}</p>}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <OrderActions order={order} onChange={onChange} compact />
        <Button asChild variant="link" size="sm" className="px-0"><Link to={`/pedido/${order.publicCode}`}><ChevronRight /> Ver pedido</Link></Button>
      </div>
    </article>
  );
}

export default function Orders() {
  useTitle('Pedidos');
  const { business } = useAuth();
  // Kept in the URL, like the filters of Explorar: reloading or going back keeps them.
  const [status, setStatus] = useUrlState('status', 'pending');
  const [period, setPeriod] = useUrlState('period', 'today');
  const [sound, setSound] = useState(readSoundPreference);
  const days = (PERIODS[period] ?? PERIODS.today).days;

  const from = useMemo(() => since(days), [days]);
  const { data: orders, setData, error, loading, reload } = useFetch<Order[]>(`/orders/mine${from ? `?since=${encodeURIComponent(from)}` : ''}`);

  const counts = useMemo(() => {
    const result: Record<string, number> = { all: orders?.length ?? 0 };
    for (const s of ORDER_STATUSES) result[s] = (orders ?? []).filter((o) => o.status === s).length;
    return result;
  }, [orders]);
  // The tabs do not hide orders: the others stay in place, dimmed, so the whole period is always in view.
  const matches = (order: Order) => status === ALL || order.status === status;
  const all = orders ?? [];

  // Every change arrives through here: our own clicks and the socket events.
  const upsert = useCallback((order: Order) => {
    setData((current) => {
      const list = current ?? [];
      return list.some((o) => o.id === order.id) ? list.map((o) => (o.id === order.id ? order : o)) : [order, ...list];
    });
  }, [setData]);

  useSocketEvent('order:created', (order) => order.businessId === business?.id && upsert(order));
  useSocketEvent('order:updated', (order) => order.businessId === business?.id && upsert(order));

  const toggleSound = () => {
    saveSoundPreference(!sound);
    setSound(!sound);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
        <Tabs value={status} onValueChange={setStatus} className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] lg:mx-0 lg:px-0">
          <TabsList>
            {(['pending', 'confirmed', 'completed', 'cancelled', ALL] as const).map((value) => (
              <TabsTrigger key={value} value={value} className="gap-1.5">
                {TAB_LABELS[value]}
                <span className={`rounded-full px-1.5 text-[11px] tabular-nums ${value === 'pending' && counts.pending ? 'bg-mustard text-[oklch(0.25_0.04_80)]' : 'bg-secondary text-muted-foreground'}`}>{counts[value] ?? 0}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="flex gap-2 lg:ml-auto">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-44 bg-card" aria-label="Período"><SelectValue /></SelectTrigger>
            <SelectContent>{Object.entries(PERIODS).map(([value, p]) => <SelectItem key={value} value={value}>{p.label}</SelectItem>)}</SelectContent>
          </Select>
          <Button variant="outline" onClick={toggleSound} aria-pressed={sound} aria-label={sound ? 'Silenciar avisos' : 'Activar sonido de avisos'}>
            {sound ? <Bell /> : <BellOff />} <span className="hidden sm:inline">{sound ? 'Sonido activado' : 'Sin sonido'}</span>
          </Button>
        </div>
      </div>

      {error ? <ErrorState message={error} onRetry={reload} /> : loading && !orders ? (
        <div className="grid gap-3 lg:grid-cols-2">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-44 rounded-2xl" />)}</div>
      ) : all.length === 0 ? (
        <EmptyState icon={Inbox} title="Todavía no hay pedidos en este período" description="Cuando un cliente te haga un pedido, aparece acá al instante." />
      ) : (
        <>
          {counts[status] === 0 && <p className="text-sm text-muted-foreground">{status === 'pending' ? 'No hay pedidos nuevos.' : 'No hay pedidos en esta vista.'} Abajo están los demás del período, atenuados.</p>}
          <div className="grid gap-3 lg:grid-cols-2">{all.map((order) => <OrderCard key={order.id} order={order} onChange={upsert} dimmed={!matches(order)} />)}</div>
        </>
      )}
    </div>
  );
}
