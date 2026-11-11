import { AlertTriangle, CheckCircle2, ExternalLink, Loader2, MessageCircle, ShoppingBag, Store, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Order } from '@shared/orders';
import { api } from '@/api';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { DELIVERY_LABELS, openStatus, PAYMENT_LABELS, type DeliveryOption, type PaymentMethod } from '@shared/business';
import { QuantityStepper } from '@/components/common/QuantityStepper';
import { SafeImage } from '@/components/common/SafeImage';
import { EmptyState } from '@/components/common/States';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useCart, type CartGroup } from '@/context/CartContext';
import { useTitle } from '@/hooks/useTitle';
import { OrdersInProgress } from '@/components/orders/RecentOrders';
import { useRecentOrders } from '@/hooks/useRecentOrders';
import { formatPrice, whatsappUrl } from '@/lib/format';
import { openWhatsApp } from '@/lib/whatsapp';
import { orderMessage } from '@/lib/orders';
import { addRecentOrder, isActive, toRecentOrder, writeRecentOrders, type RecentOrder } from '@/lib/recentOrders';
import { readCustomer, writeCustomer, type CustomerDetails } from '@/lib/customer';
import { useAuth } from '@/context/AuthContext';

/** Orders sent in this tab, so their confirmation is still there when the customer comes back from WhatsApp. */
const SENT_KEY = 'detoke.checkoutSent';
const SENT_TTL_MS = 30 * 60 * 1000;


function readSent(): RecentOrder[] {
  try {
    const list = JSON.parse(sessionStorage.getItem(SENT_KEY) ?? '[]');
    // Only recent ones: an old visit to the checkout should start clean.
    return Array.isArray(list) ? list.filter((o: RecentOrder) => Date.now() - new Date(o.createdAt).getTime() < SENT_TTL_MS) : [];
  } catch {
    return [];
  }
}


function OptionButton({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={selected} className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${selected ? 'border-primary bg-primary/10 text-primary' : 'bg-card hover:border-primary/40'}`}>
      {children}
    </button>
  );
}

/** One id per checkout attempt: a retry or a double click must not create a second order. */
function newRequestId() {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** What is left of a business card once its order went out: a confirmation and the link to follow it. */
function SentCard({ order }: { order: RecentOrder }) {
  const resend = () => openWhatsApp(whatsappUrl(order.businessWhatsapp, orderMessage(order.url)));
  return (
    <section className="rounded-2xl border-2 border-success/60 bg-card p-4" aria-label={`Pedido realizado a ${order.businessName}`}>
      <p className="flex items-center gap-2 font-semibold"><CheckCircle2 className="size-5 text-success" /> Pedido realizado ✓</p>
      <p className="mt-1 text-sm text-muted-foreground">Pedido #{order.number} a {order.businessName} · {formatPrice(order.total)}. Te avisamos acá cuando lo confirmen.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button asChild size="sm"><Link to={`/pedido/${order.publicCode}`}><ExternalLink /> Ver estado</Link></Button>
        <Button variant="ghost" size="sm" onClick={resend}><MessageCircle /> Reenviar por WhatsApp</Button>
      </div>
    </section>
  );
}

function OrderCard({ group, customer, setCustomer, index, count, onSent }: { group: CartGroup; customer: CustomerDetails; setCustomer: (c: CustomerDetails) => void; index: number; count: number; onSent: (order: RecentOrder) => void }) {
  const { business } = group;
  const { setQuantity, removeBusiness } = useCart();
  const [method, setMethod] = useState<DeliveryOption>(business.deliveryOptions[0] ?? 'pickup');
  const [payment, setPayment] = useState<PaymentMethod>(business.paymentMethods[0] ?? 'cash');
  const [notes, setNotes] = useState('');
  const [showErrors, setShowErrors] = useState(false);

  const shipping = method === 'delivery' ? business.deliveryFee ?? 0 : 0;
  const total = group.subtotal + shipping;
  const missing = method === 'delivery' && business.minimumOrder ? business.minimumOrder - group.subtotal : 0;
  const status = openStatus(business.hours);
  const nameError = showErrors && !customer.name.trim();
  const addressError = showErrors && method === 'delivery' && !customer.address.trim();

  const [sending, setSending] = useState(false);
  // Kept until the order is created, so a retry after a lost response returns the same order.
  const requestId = useRef<string | null>(null);
  const busy = useRef(false);

  const send = async () => {
    setShowErrors(true);
    if (!customer.name.trim() || (method === 'delivery' && !customer.address.trim()) || missing > 0) return;
    // A second click while the first is on its way does nothing.
    if (busy.current) return;
    busy.current = true;
    setSending(true);
    requestId.current ??= newRequestId();
    try {
      const { order, url } = await api<{ order: Order; url: string }>('/orders', {
        method: 'POST',
        body: {
          clientRequestId: requestId.current,
          businessId: business.id,
          items: group.items.map((item) => ({ productId: item.id, quantity: item.quantity })),
          fulfillment: method,
          paymentMethod: payment,
          customerName: customer.name,
          customerPhone: customer.phone || null,
          deliveryAddress: method === 'delivery' ? customer.address : null,
          notes,
        },
      });
      requestId.current = null;
      const recent = toRecentOrder(order, business, url);
      writeRecentOrders((list) => addRecentOrder(list, recent));
      // The order is out: only this business leaves the cart, the others stay as they were.
      removeBusiness(business.id);
      onSent(recent);
      // Desktop opens in a new tab (WhatsApp Web), a phone in the same tab so the app launches and Back returns here.
      openWhatsApp(whatsappUrl(business.whatsapp, orderMessage(url)));
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      busy.current = false;
      setSending(false);
    }
  };

  return (
    <section id={`order-${business.id}`} className={`scroll-mt-24 rounded-2xl border-2 bg-card ${count > 1 ? 'border-primary/30' : 'border-border'}`} aria-label={`Pedido ${index + 1} de ${count}: ${business.name}`}>
      {count > 1 && (
        <div className="flex items-center justify-between gap-2 rounded-t-[14px] bg-secondary px-4 py-2 text-xs font-semibold uppercase tracking-wide">
          <span>Pedido {index + 1} de {count}</span>
          <span className="text-muted-foreground">Sin enviar</span>
        </div>
      )}
      <header className="flex items-center gap-3 border-b p-4">
        <SafeImage src={business.logo} alt="" className="size-11 rounded-lg" />
        <div className="min-w-0 flex-1">
          <Link to={`/negocio/${business.slug}`} className="block truncate font-semibold hover:underline">{business.name}</Link>
          <p className="truncate text-xs text-muted-foreground">{status.label}</p>
        </div>
        <Button variant="ghost" size="icon" aria-label={`Quitar pedido a ${business.name}`} onClick={() => removeBusiness(business.id)}><Trash2 className="size-4" /></Button>
      </header>

      <ul className="divide-y">
        {group.items.map((item) => (
          <li key={item.id} className="flex items-center gap-3 px-4 py-3">
            <SafeImage src={item.image} alt="" className="size-12 shrink-0 rounded-lg" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{item.name}</p>
              <p className="text-sm text-muted-foreground">{formatPrice(item.price)}</p>
            </div>
            <QuantityStepper quantity={item.quantity} name={item.name} onChange={(q) => setQuantity(item.id, q)} />
          </li>
        ))}
      </ul>

      <div className="space-y-4 border-t p-4">
        <fieldset>
          <legend className="mb-2 text-sm font-semibold">¿Cómo lo recibís?</legend>
          <div className="flex flex-wrap gap-2">
            {business.deliveryOptions.map((option) => <OptionButton key={option} selected={method === option} onClick={() => setMethod(option)}>{DELIVERY_LABELS[option]}</OptionButton>)}
          </div>
        </fieldset>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor={`name-${business.id}`}>Tu nombre</Label>
            <Input id={`name-${business.id}`} autoComplete="name" value={customer.name} aria-invalid={nameError} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} />
            {nameError && <p className="text-sm text-destructive">Completá tu nombre</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`phone-${business.id}`}>Tu teléfono (opcional)</Label>
            <Input id={`phone-${business.id}`} type="tel" autoComplete="tel" value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} placeholder="Para que el negocio te avise" />
          </div>
          {method === 'delivery' && (
            <div className="space-y-1.5">
              <Label htmlFor={`delivery-${business.id}`}>Dirección de entrega</Label>
              <Input id={`delivery-${business.id}`} noAutofill placeholder="Calle, número y piso" value={customer.address} aria-invalid={addressError} onChange={(e) => setCustomer({ ...customer, address: e.target.value })} />
              {addressError && <p className="text-sm text-destructive">Completá la dirección</p>}
            </div>
          )}
        </div>

        <fieldset>
          <legend className="mb-2 text-sm font-semibold">¿Cómo pagás?</legend>
          <div className="flex flex-wrap gap-2">
            {business.paymentMethods.map((m) => <OptionButton key={m} selected={payment === m} onClick={() => setPayment(m)}>{PAYMENT_LABELS[m]}</OptionButton>)}
          </div>
        </fieldset>

        <div className="space-y-1.5">
          <Label htmlFor={`notes-${business.id}`}>Aclaraciones (opcional)</Label>
          <Textarea id={`notes-${business.id}`} rows={2} placeholder="Sin cebolla, tocar timbre 3B..." value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        <dl className="space-y-1 rounded-xl bg-secondary/60 p-3 text-sm">
          <div className="flex justify-between"><dt className="text-muted-foreground">Subtotal</dt><dd>{formatPrice(group.subtotal)}</dd></div>
          {method === 'delivery' && <div className="flex justify-between"><dt className="text-muted-foreground">Envío</dt><dd>{shipping ? formatPrice(shipping) : 'Gratis'}</dd></div>}
          <div className="flex justify-between pt-1 text-base font-semibold"><dt>Total</dt><dd>{formatPrice(total)}</dd></div>
        </dl>

        {missing > 0 && (
          <Alert><AlertTriangle /><AlertDescription>El pedido mínimo para delivery es {formatPrice(business.minimumOrder ?? 0)}. Te faltan {formatPrice(missing)}{business.deliveryOptions.includes('pickup') ? ', o podés retirarlo en el local' : ''}.</AlertDescription></Alert>
        )}
        {!status.isOpen && <p className="text-sm text-warning-foreground">Ahora está cerrado. Podés mandar el pedido y lo verán cuando abran.</p>}

        <Button size="lg" className="w-full" disabled={missing > 0 || sending} onClick={send}>{sending ? <Loader2 className="animate-spin" /> : <MessageCircle />} {sending ? 'Enviando…' : count > 1 ? `Enviar pedido a ${business.name}` : 'Enviar pedido por WhatsApp'}</Button>
      </div>
    </section>
  );
}

export default function Checkout() {
  useTitle('Tu pedido');
  const { groups } = useCart();
  const recent = useRecentOrders();
  const { user } = useAuth();
  // Signed in: the profile fills what this browser does not have yet.
  const [customer, setCustomer] = useState<CustomerDetails>(() => {
    const local = readCustomer();
    return user ? { name: local.name || user.name, phone: local.phone || user.phone || '', address: local.address || user.address || '' } : local;
  });
  // Orders sent from this page: their card stays as a confirmation, also after coming back from WhatsApp.
  const [sent, setSent] = useState<RecentOrder[]>(readSent);
  const many = groups.length > 1;
  const grandTotal = groups.reduce((sum, g) => sum + g.subtotal, 0);
  const sentCodes = new Set(sent.map((o) => o.publicCode));
  // Fresh status for the confirmations, from the shared list.
  // Only while they are in progress: the checkout is not a history (that is Mis pedidos).
  const sentNow = sent.map((o) => recent.find((r) => r.publicCode === o.publicCode) ?? o).filter(isActive);
  const hasFinished = recent.some((o) => !isActive(o));

  // Written right away, not in an effect: the page leaves for WhatsApp just after.
  const addSent = (order: RecentOrder) => {
    const next = [order, ...sent.filter((o) => o.publicCode !== order.publicCode)];
    try {
      sessionStorage.setItem(SENT_KEY, JSON.stringify(next));
    } catch {
      /* storage not available */
    }
    setSent(next);
  };

  useEffect(() => {
    try {
      writeCustomer(customer);
    } catch {
      /* storage not available */
    }
  }, [customer]);

  return (
    <div className="mx-auto max-w-form px-4 py-8">
      <h1 className="text-3xl font-bold sm:text-4xl">{groups.length === 0 && sentNow.length > 0 ? '¡Listo!' : 'Tu pedido'}</h1>
      {many && (
        <div role="status" className="mt-4 rounded-2xl border-2 border-mustard bg-accent p-4 text-accent-foreground">
          <p className="flex items-center gap-2 font-semibold"><Store className="size-5 shrink-0" /> Tenés {groups.length} pedidos separados</p>
          <p className="mt-1 text-sm">Cada negocio recibe su pedido por WhatsApp y se paga por separado. Enviá cada uno con su botón.</p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {groups.map((g, i) => (
              <li key={g.business.id}>
                <a href={`#order-${g.business.id}`} className="flex items-center gap-2 rounded-full border bg-card px-2 py-1 pr-3 text-sm text-foreground hover:border-primary">
                  <SafeImage src={g.business.logo} alt="" className="size-6 rounded-full" />
                  <span className="font-medium">{i + 1}. {g.business.name}</span>
                  <span className="text-muted-foreground">{formatPrice(g.subtotal)}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="mt-6 space-y-6">
        {sentNow.map((order) => <SentCard key={order.publicCode} order={order} />)}
        {groups.length === 0 && sentNow.length === 0 ? (
          <EmptyState icon={ShoppingBag} title="Tu pedido está vacío" description="Elegí un negocio del barrio y sumá lo que necesites." action={<Button asChild><Link to="/explorar">Explorar negocios</Link></Button>} />
        ) : groups.map((group, i) => (
          <OrderCard key={group.business.id} group={group} customer={customer} setCustomer={setCustomer} index={i} count={groups.length} onSent={addSent} />
        ))}
      </div>
      {many && (
        <div className="mt-6 flex items-center justify-between rounded-2xl border bg-card p-4">
          <div>
            <p className="font-semibold">Total de los {groups.length} pedidos</p>
            <p className="text-sm text-muted-foreground">Sin envíos. Cada negocio cobra su parte por separado.</p>
          </div>
          <p className="font-display text-xl font-semibold">{formatPrice(grandTotal)}</p>
        </div>
      )}
      {!user && groups.length > 0 && (
        <p className="mt-6 text-center text-sm text-muted-foreground">
          <Link to="/register?type=customer" className="font-medium text-foreground hover:underline">Creá una cuenta</Link> para guardar tus pedidos y tu carrito en cualquier dispositivo.
        </p>
      )}
      <OrdersInProgress orders={recent.filter((o) => !sentCodes.has(o.publicCode))} className="mt-10" />
      {hasFinished && !recent.some((o) => isActive(o) && !sentCodes.has(o.publicCode)) && (
        <p className="mt-10 text-center text-sm"><Link to="/mis-pedidos" className="text-muted-foreground hover:text-foreground hover:underline">Ver mis pedidos</Link></p>
      )}
    </div>
  );
}
