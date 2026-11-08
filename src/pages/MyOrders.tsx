import { ReceiptText } from 'lucide-react';
import { Link } from 'react-router-dom';
import { EmptyState } from '@/components/common/States';
import { RecentOrderList } from '@/components/orders/RecentOrders';
import { Button } from '@/components/ui/button';
import { useRecentOrders } from '@/hooks/useRecentOrders';
import { useTitle } from '@/hooks/useTitle';
import { isActive } from '@/lib/recentOrders';

export default function MyOrders() {
  useTitle('Mis pedidos');
  const orders = useRecentOrders();
  const active = orders.filter(isActive);
  const finished = orders.filter((o) => !isActive(o));

  return (
    <div className="mx-auto max-w-form px-4 py-8">
      <h1 className="text-3xl font-bold sm:text-4xl">Mis pedidos</h1>
      <p className="mt-2 text-sm text-muted-foreground">Los pedidos que hiciste desde este dispositivo. Los entregados o cancelados se borran solos a los dos días.</p>
      {orders.length === 0 ? (
        <div className="mt-8"><EmptyState icon={ReceiptText} title="Todavía no hiciste pedidos" description="Cuando mandes un pedido, lo vas a poder seguir desde acá." action={<Button asChild><Link to="/explorar">Explorar negocios</Link></Button>} /></div>
      ) : (
        <div className="mt-8 space-y-8">
          {active.length > 0 && (
            <section aria-labelledby="active-orders">
              <h2 id="active-orders" className="mb-3 font-semibold">En curso</h2>
              <RecentOrderList orders={active} />
            </section>
          )}
          {finished.length > 0 && (
            <section aria-labelledby="finished-orders">
              <h2 id="finished-orders" className="mb-3 font-semibold text-muted-foreground">Finalizados</h2>
              <RecentOrderList orders={finished} />
            </section>
          )}
        </div>
      )}
    </div>
  );
}
