import { Bell, BellOff, Bike, ExternalLink, Inbox, Store } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PAYMENT_LABELS } from '@shared/business';
import { ACTIVE_STATUSES, FINAL_STATUSES, statusLabel, type Order, type OrderStatus } from '@shared/orders';
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
import { formatPrice } from '@/lib/format';
import { itemsSummary, statusVariant, timeAgo } from '@/lib/orders';

const TABS: { value: string; label: string; statuses: OrderStatus[] }[] = [
  { value: 'new', label: 'Nuevos', statuses: ['pending'] },
  { value: 'active', label: 'En curso', statuses: ACTIVE_STATUSES },
  { value: 'done', label: 'Finalizados', statuses: FINAL_STATUSES },
  { value: 'all', label: 'Todos', statuses: [] },
];

const PERIODS: Record<string, { label: string; days: number | null }> = {
  today: { label: 'Hoy', days: 0 },
  week: { label: 'Últimos 7 días', days: 7 },
  month: { label: 'Últimos 30 días', days: 30 },
  all: { label: 'Todos', days: null },
};

function since(days: number | null) {
  if (days === null) return null;
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

function OrderCard({ order, onChange }: { order: Order; onChange: (order: Order) => void }) {
  return (
    <article className={`rounded-2xl border bg-card p-4 ${order.status === 'pending' ? 'border-warning/70 shadow-sm' : ''}`}>
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold">Pedido #{order.number} · {order.customerName}</p>
          <p className="text-xs text-muted-foreground">{timeAgo(order.createdAt)}</p>
        </div>
        <Badge variant={statusVariant(order.status)}>{statusLabel(order.status, order.fulfillment)}</Badge>
      </header>
      <p className="mt-3 text-sm">{itemsSummary(order)}</p>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
        <span className="flex items-center gap-1">{order.fulfillment === 'delivery' ? <Bike className="size-4" /> : <Store className="size-4" />}{order.fulfillment === 'delivery' ? order.deliveryAddress : 'Retira en el local'}</span>
        <span>{PAYMENT_LABELS[order.paymentMethod]}</span>
        <span className="font-semibold text-foreground">{formatPrice(order.total)}</span>
      </div>
      {order.notes && <p className="mt-2 rounded-lg bg-secondary px-3 py-2 text-sm">“{order.notes}”</p>}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <OrderActions order={order} onChange={onChange} compact />
        <Button asChild variant="link" size="sm" className="px-0"><Link to={`/pedido/${order.publicCode}`} target="_blank"><ExternalLink /> Ver pedido</Link></Button>
      </div>
    </article>
  );
}

export default function Orders() {
  useTitle('Pedidos');
  const { business } = useAuth();
  const [tab, setTab] = useState('new');
  const [period, setPeriod] = useState('week');
  const [sound, setSound] = useState(readSoundPreference);
  const statuses = TABS.find((t) => t.value === tab)!.statuses;

  const query = useMemo(() => {
    const q = new URLSearchParams();
    if (statuses.length) q.set('status', statuses.join(','));
    const from = since(PERIODS[period].days);
    if (from) q.set('since', from);
    return q.toString();
  }, [statuses, period]);
  const { data: orders, setData, error, loading, reload } = useFetch<Order[]>(`/orders/mine?${query}`);

  const matches = useCallback((order: Order) => statuses.length === 0 || statuses.includes(order.status), [statuses]);
  const upsert = useCallback((order: Order) => {
    setData((current) => {
      const list = current ?? [];
      const others = list.filter((o) => o.id !== order.id);
      if (!matches(order)) return others;
      return list.some((o) => o.id === order.id) ? list.map((o) => (o.id === order.id ? order : o)) : [order, ...list];
    });
  }, [setData, matches]);

  useSocketEvent('order:created', (order) => order.businessId === business?.id && upsert(order));
  useSocketEvent('order:updated', (order) => order.businessId === business?.id && upsert(order));

  const toggleSound = () => {
    saveSoundPreference(!sound);
    setSound(!sound);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>{TABS.map((t) => <TabsTrigger key={t.value} value={t.value}>{t.label}</TabsTrigger>)}</TabsList>
        </Tabs>
        <div className="flex gap-2 sm:ml-auto">
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
      ) : (orders ?? []).length === 0 ? (
        <EmptyState icon={Inbox} title={tab === 'new' ? 'No hay pedidos nuevos' : 'No hay pedidos en esta vista'} description="Cuando un cliente te haga un pedido, aparece acá al instante." />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">{orders!.map((order) => <OrderCard key={order.id} order={order} onChange={upsert} />)}</div>
      )}
    </div>
  );
}
