import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { DELIVERY_LABELS, DELIVERY_OPTIONS, PAYMENT_LABELS, PAYMENT_METHODS, type DeliveryOption, type PaymentMethod } from '@shared/business';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/context/AuthContext';
import { useBusinessSaver } from '@/hooks/useBusinessSaver';
import { useTitle } from '@/hooks/useTitle';

function CheckList<T extends string>({ options, labels, value, onChange }: { options: readonly T[]; labels: Record<T, string>; value: T[]; onChange: (value: T[]) => void }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {options.map((option) => (
        <Label key={option} className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 font-medium has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5">
          <Checkbox checked={value.includes(option)} onCheckedChange={(checked) => onChange(checked ? [...value, option] : value.filter((v) => v !== option))} />
          {labels[option]}
        </Label>
      ))}
    </div>
  );
}

export default function DeliveryPayments() {
  useTitle('Entrega y pagos');
  const { business } = useAuth();
  const { save } = useBusinessSaver();
  const [options, setOptions] = useState<DeliveryOption[]>(business?.deliveryOptions ?? []);
  const [payments, setPayments] = useState<PaymentMethod[]>(business?.paymentMethods ?? []);
  const [deliveryFee, setDeliveryFee] = useState(String(business?.deliveryFee ?? ''));
  const [minimumOrder, setMinimumOrder] = useState(String(business?.minimumOrder ?? ''));
  const [deliveryRadiusKm, setDeliveryRadiusKm] = useState(String(business?.deliveryRadiusKm ?? ''));
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    await save({ deliveryOptions: options, paymentMethods: payments, deliveryFee, minimumOrder, deliveryRadiusKm });
    setBusy(false);
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg">Formas de entrega</CardTitle>
          <CardDescription>Elegí al menos una.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <CheckList options={DELIVERY_OPTIONS} labels={DELIVERY_LABELS} value={options} onChange={setOptions} />
          {options.includes('delivery') && (
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2"><Label htmlFor="fee">Costo de envío</Label><Input id="fee" type="number" min={0} inputMode="decimal" placeholder="0 = gratis" value={deliveryFee} onChange={(e) => setDeliveryFee(e.target.value)} /></div>
              <div className="space-y-2"><Label htmlFor="minimum">Pedido mínimo</Label><Input id="minimum" type="number" min={0} inputMode="decimal" placeholder="Sin mínimo" value={minimumOrder} onChange={(e) => setMinimumOrder(e.target.value)} /></div>
              <div className="space-y-2"><Label htmlFor="radius">Radio de entrega (km)</Label><Input id="radius" type="number" min={0} inputMode="decimal" value={deliveryRadiusKm} onChange={(e) => setDeliveryRadiusKm(e.target.value)} /></div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg">Medios de pago</CardTitle>
          <CardDescription>Los clientes eligen uno al hacer el pedido.</CardDescription>
        </CardHeader>
        <CardContent><CheckList options={PAYMENT_METHODS} labels={PAYMENT_LABELS} value={payments} onChange={setPayments} /></CardContent>
      </Card>

      <Button type="submit" size="lg" disabled={busy}>{busy && <Loader2 className="animate-spin" />} Guardar cambios</Button>
    </form>
  );
}
