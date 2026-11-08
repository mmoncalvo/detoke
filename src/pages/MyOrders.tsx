import { ReceiptText, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { EmptyState } from '@/components/common/States';
import { RecentOrderList } from '@/components/orders/RecentOrders';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { useRecentOrders } from '@/hooks/useRecentOrders';
import { useTitle } from '@/hooks/useTitle';
import { isActive, removeRecentOrders, writeRecentOrders } from '@/lib/recentOrders';

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
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 id="finished-orders" className="font-semibold text-muted-foreground">Finalizados</h2>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 px-2 text-muted-foreground"><Trash2 /> Eliminar todos</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>¿Eliminar los pedidos finalizados?</AlertDialogTitle>
                      <AlertDialogDescription>Se quitan {finished.length === 1 ? 'el pedido entregado o cancelado' : `los ${finished.length} pedidos entregados o cancelados`} de la lista de este dispositivo. Los pedidos siguen existiendo para cada negocio.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => writeRecentOrders((list) => removeRecentOrders(list, finished.map((o) => o.publicCode)))}>Eliminar todos</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
              <RecentOrderList orders={finished} />
            </section>
          )}
        </div>
      )}
    </div>
  );
}
