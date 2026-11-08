import { ReceiptText, Trash2 } from 'lucide-react';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import type { Order } from '@shared/orders';
import { EmptyState } from '@/components/common/States';
import { RecentOrderList } from '@/components/orders/RecentOrders';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { api } from '@/api';
import { useAuth } from '@/context/AuthContext';
import { useFetch } from '@/hooks/useFetch';
import { useRecentOrders } from '@/hooks/useRecentOrders';
import { useTitle } from '@/hooks/useTitle';
import { isActive, removeRecentOrders, toRecentOrder, writeRecentOrders, type RecentOrder } from '@/lib/recentOrders';

/** A signed-in buyer's whole history, with the live status the browser keeps for orders in progress. */
function useAccountOrders(enabled: boolean, local: RecentOrder[]) {
  const { data, reload } = useFetch<Order[]>(enabled ? '/orders/customer' : null);
  const orders = useMemo(() => {
    if (!data) return null;
    const live = new Map(local.map((o) => [o.publicCode, o]));
    return data.filter((o) => o.business).map((o) => {
      const saved = toRecentOrder(o, { id: o.businessId, name: o.business!.name, slug: o.business!.slug, whatsapp: o.business!.whatsapp }, `${window.location.origin}/pedido/${o.publicCode}`);
      const fresh = live.get(o.publicCode);
      return fresh ? { ...saved, status: fresh.status, updatedAt: fresh.updatedAt } : saved;
    });
  }, [data, local]);
  return { orders, reload };
}

export default function MyOrders() {
  useTitle('Mis pedidos');
  const { user, impersonatedBy } = useAuth();
  const local = useRecentOrders();
  const signedIn = !!user && user.role !== 'admin' && !impersonatedBy;
  const account = useAccountOrders(signedIn, local);
  const orders = signedIn && account.orders ? account.orders : local;

  // Signed in, removing hides the order from the account's history (the business keeps it).
  const hide = async (order: RecentOrder) => {
    try {
      await api(`/orders/customer/${order.publicCode}`, { method: 'DELETE' });
      writeRecentOrders((list) => removeRecentOrders(list, [order.publicCode]));
      account.reload();
      toast('Pedido quitado de tu historial', {
        action: { label: 'Deshacer', onClick: () => void api(`/orders/customer/${order.publicCode}/restore`, { method: 'POST' }).then(account.reload) },
      });
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const clearHistory = async () => {
    try {
      if (signedIn) {
        await api('/orders/customer', { method: 'DELETE' });
        account.reload();
      }
      writeRecentOrders((list) => removeRecentOrders(list, finished.map((o) => o.publicCode)));
    } catch (err) {
      toast.error((err as Error).message);
    }
  };
  const active = orders.filter(isActive);
  const finished = orders.filter((o) => !isActive(o));

  return (
    <div className="mx-auto max-w-form px-4 py-8">
      <h1 className="text-3xl font-bold sm:text-4xl">Mis pedidos</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {signedIn ? 'Todos tus pedidos, guardados en tu cuenta.' : <>Guardados en este dispositivo. <Link to="/register?type=customer" className="font-medium text-foreground hover:underline">Creá una cuenta</Link> para no perderlos.</>}
      </p>
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
                <h2 id="finished-orders" className="font-semibold text-muted-foreground">Historial</h2>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 px-2 text-muted-foreground"><Trash2 /> Eliminar todos</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>¿Eliminar el historial?</AlertDialogTitle>
                      <AlertDialogDescription>Se quitan {finished.length === 1 ? 'el pedido finalizado o cancelado' : `los ${finished.length} pedidos finalizados o cancelados`} {signedIn ? 'de tu cuenta' : 'de este dispositivo'}. Cada negocio conserva sus pedidos. Los que están en curso no se tocan.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => void clearHistory()}>Eliminar todos</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
              <RecentOrderList orders={finished} onRemove={signedIn ? (o) => void hide(o) : undefined} />
            </section>
          )}
        </div>
      )}
    </div>
  );
}
