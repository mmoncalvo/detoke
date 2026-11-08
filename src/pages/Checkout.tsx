import { AlertTriangle, CheckCircle2, MessageCircle, ShoppingBag, Store, Trash2, Undo2 } from 'lucide-react';
import { useEffect, useState } from 'react';
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
import { formatPrice, whatsappUrl } from '@/lib/format';

const CUSTOMER_KEY = 'detoke.customer';

interface Customer {
  name: string;
  address: string;
}

function readCustomer(): Customer {
  try {
    return { name: '', address: '', ...JSON.parse(localStorage.getItem(CUSTOMER_KEY) ?? '{}') };
  } catch {
    return { name: '', address: '' };
  }
}

function OptionButton({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={selected} className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${selected ? 'border-primary bg-primary/10 text-primary' : 'bg-card hover:border-primary/40'}`}>
      {children}
    </button>
  );
}

function buildMessage(group: CartGroup, customer: Customer, method: DeliveryOption, payment: PaymentMethod, notes: string, shipping: number) {
  const lines = [`¡Hola ${group.business.name}! Quiero hacer un pedido por Detoke:`, ''];
  for (const item of group.items) lines.push(`• ${item.quantity} x ${item.name} — ${formatPrice(item.price * item.quantity)}`);
  lines.push('', `Subtotal: ${formatPrice(group.subtotal)}`);
  if (method === 'delivery') lines.push(`Envío: ${shipping ? formatPrice(shipping) : 'Gratis'}`);
  lines.push(`*Total: ${formatPrice(group.subtotal + shipping)}*`, '');
  lines.push(`Entrega: ${DELIVERY_LABELS[method]}`);
  if (method === 'delivery') lines.push(`Dirección: ${customer.address}`);
  lines.push(`Pago: ${PAYMENT_LABELS[payment]}`, `Nombre: ${customer.name}`);
  if (notes.trim()) lines.push(`Aclaraciones: ${notes.trim()}`);
  return lines.join('\n');
}

function OrderCard({ group, customer, setCustomer, index, count, sent, onSent }: { group: CartGroup; customer: Customer; setCustomer: (c: Customer) => void; index: number; count: number; sent: boolean; onSent: (sent: boolean) => void }) {
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

  const send = () => {
    setShowErrors(true);
    if (!customer.name.trim() || (method === 'delivery' && !customer.address.trim()) || missing > 0) return;
    window.open(whatsappUrl(business.whatsapp, buildMessage(group, customer, method, payment, notes, shipping)), '_blank', 'noopener');
    onSent(true);
  };

  return (
    <section id={`order-${business.id}`} className={`scroll-mt-24 rounded-2xl border-2 bg-card ${sent ? 'border-success/60' : count > 1 ? 'border-primary/30' : 'border-border'}`} aria-label={`Pedido ${index + 1} de ${count}: ${business.name}`}>
      {count > 1 && (
        <div className="flex items-center justify-between gap-2 rounded-t-[14px] bg-secondary px-4 py-2 text-xs font-semibold uppercase tracking-wide">
          <span>Pedido {index + 1} de {count}</span>
          {sent ? <span className="flex items-center gap-1 text-success-foreground"><CheckCircle2 className="size-4" /> Enviado</span> : <span className="text-muted-foreground">Pendiente</span>}
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
          {method === 'delivery' && (
            <div className="space-y-1.5">
              <Label htmlFor={`address-${business.id}`}>Dirección de entrega</Label>
              <Input id={`address-${business.id}`} autoComplete="street-address" placeholder="Calle, número y piso" value={customer.address} aria-invalid={addressError} onChange={(e) => setCustomer({ ...customer, address: e.target.value })} />
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

        <Button size="lg" className="w-full" variant={sent ? 'outline' : 'default'} disabled={missing > 0} onClick={send}><MessageCircle /> {sent ? 'Volver a enviar' : count > 1 ? `Enviar pedido a ${business.name}` : 'Enviar pedido por WhatsApp'}</Button>
        {sent && (
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="flex items-center gap-1.5 text-success-foreground"><CheckCircle2 className="size-4" /> Abrimos WhatsApp con este pedido.</span>
            <span className="flex gap-1">
              <Button variant="ghost" size="sm" onClick={() => onSent(false)}><Undo2 /> Deshacer</Button>
              <Button variant="ghost" size="sm" onClick={() => removeBusiness(business.id)}><Trash2 /> Quitar del carrito</Button>
            </span>
          </div>
        )}
      </div>
    </section>
  );
}

export default function Checkout() {
  useTitle('Tu pedido');
  const { groups } = useCart();
  const [customer, setCustomer] = useState<Customer>(readCustomer);
  const [sent, setSent] = useState<string[]>([]);
  const many = groups.length > 1;
  const sentCount = groups.filter((g) => sent.includes(g.business.id)).length;
  const grandTotal = groups.reduce((sum, g) => sum + g.subtotal, 0);
  const markSent = (id: string, value: boolean) => setSent((list) => (value ? [...new Set([...list, id])] : list.filter((x) => x !== id)));

  useEffect(() => {
    try {
      localStorage.setItem(CUSTOMER_KEY, JSON.stringify(customer));
    } catch {
      /* storage not available */
    }
  }, [customer]);

  return (
    <div className="mx-auto max-w-form px-4 py-8">
      <h1 className="text-3xl font-bold sm:text-4xl">Tu pedido</h1>
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
                  {sent.includes(g.business.id) && <CheckCircle2 className="size-4 text-success" aria-label="Enviado" />}
                </a>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm font-medium">{sentCount} de {groups.length} pedidos enviados</p>
        </div>
      )}
      <div className="mt-6 space-y-6">
        {groups.length === 0 ? (
          <EmptyState icon={ShoppingBag} title="Tu pedido está vacío" description="Elegí un negocio del barrio y sumá lo que necesites." action={<Button asChild><Link to="/explorar">Explorar negocios</Link></Button>} />
        ) : groups.map((group, i) => (
          <OrderCard key={group.business.id} group={group} customer={customer} setCustomer={setCustomer} index={i} count={groups.length} sent={sent.includes(group.business.id)} onSent={(v) => markSent(group.business.id, v)} />
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
    </div>
  );
}
