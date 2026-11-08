import { ShoppingBag, X } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { EmptyState } from '@/components/common/States';
import { QuantityStepper } from '@/components/common/QuantityStepper';
import { SafeImage } from '@/components/common/SafeImage';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useCart } from '@/context/CartContext';
import { formatPrice } from '@/lib/format';

export function CartSheet() {
  const { groups, count, isOpen, setOpen, setQuantity, removeBusiness } = useCart();
  const navigate = useNavigate();
  const total = groups.reduce((sum, g) => sum + g.subtotal, 0);

  return (
    <Sheet open={isOpen} onOpenChange={setOpen}>
      <SheetContent className="flex w-full flex-col gap-0 sm:max-w-md">
        <SheetHeader className="border-b">
          <SheetTitle className="font-display text-xl">Tu pedido</SheetTitle>
          <SheetDescription>{count === 0 ? 'Todavía no agregaste nada.' : `${count} ${count === 1 ? 'producto' : 'productos'} de ${groups.length} ${groups.length === 1 ? 'negocio' : 'negocios'}`}</SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-6 overflow-y-auto p-4">
          {groups.length > 1 && (
            <p role="status" className="rounded-xl border-2 border-mustard bg-accent px-3 py-2 text-sm text-accent-foreground">
              Son <strong>{groups.length} pedidos separados</strong>, uno por negocio: cada uno se envía y se paga aparte.
            </p>
          )}
          {groups.length === 0 && (
            <EmptyState icon={ShoppingBag} title="Tu pedido está vacío" description="Elegí un negocio del barrio y sumá lo que necesites." action={<Button onClick={() => { setOpen(false); navigate('/explorar'); }}>Explorar negocios</Button>} />
          )}
          {groups.map((group) => (
            <section key={group.business.id} aria-label={group.business.name}>
              <div className="mb-2 flex items-center justify-between gap-2">
                <Link to={`/negocio/${group.business.slug}`} onClick={() => setOpen(false)} className="truncate font-semibold hover:underline">{group.business.name}</Link>
                <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => removeBusiness(group.business.id)}><X /> Quitar</Button>
              </div>
              <ul className="divide-y rounded-xl border bg-card">
                {group.items.map((item) => (
                  <li key={item.id} className="flex items-center gap-3 p-3">
                    <SafeImage src={item.image} alt="" className="size-12 shrink-0 rounded-lg" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{item.name}</p>
                      <p className="text-sm text-muted-foreground">{formatPrice(item.price * item.quantity)}</p>
                    </div>
                    <QuantityStepper quantity={item.quantity} name={item.name} onChange={(q) => setQuantity(item.id, q)} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        {groups.length > 0 && (
          <SheetFooter className="border-t">
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-muted-foreground">Subtotal</span>
              <span className="font-display text-xl font-semibold">{formatPrice(total)}</span>
            </div>
            <Button size="lg" onClick={() => { setOpen(false); navigate('/checkout'); }}>Continuar con el pedido</Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
