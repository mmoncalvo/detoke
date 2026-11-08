import { Check, ChevronRight, Copy, EyeOff, Images, Package, Share2, Star } from 'lucide-react';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { profileChecklist } from '@shared/profile';
import { FINAL_STATUSES, type Order } from '@shared/orders';
import type { Product } from '@shared/types';
import { OpenBadge } from '@/components/business/OpenBadge';
import { ErrorState } from '@/components/common/States';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/context/AuthContext';
import { useFetch } from '@/hooks/useFetch';
import { useTitle } from '@/hooks/useTitle';
import { formatPrice } from '@/lib/format';

function Stat({ icon: Icon, label, value }: { icon: typeof Package; label: string; value: number }) {
  return (
    <Card className="gap-1 py-4">
      <CardContent className="px-4">
        <Icon className="mb-2 size-5 text-primary" />
        <p className="font-display text-3xl font-bold tabular-nums">{value}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}

export default function Overview() {
  useTitle('Resumen');
  const { business } = useAuth();
  const { data: products, error, loading, reload } = useFetch<Product[]>('/products/mine');
  const today = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return start.toISOString();
  }, []);
  const orders = useFetch<Order[]>(`/orders/mine?since=${encodeURIComponent(today)}`);
  if (!business) return null;

  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (loading || !products) return <div className="space-y-4"><Skeleton className="h-40 w-full" /><Skeleton className="h-64 w-full" /></div>;

  const available = products.filter((p) => p.isAvailable).length;
  const steps = profileChecklist(business, available);
  const done = steps.filter((s) => s.done).length;
  const publicUrl = `${window.location.origin}/negocio/${business.slug}`;

  const copy = async () => {
    await navigator.clipboard.writeText(publicUrl);
    toast.success('Enlace copiado');
  };
  const share = () => (navigator.share ? navigator.share({ title: business.name, url: publicUrl }).catch(() => undefined) : copy());

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-2xl font-bold">Hola, {business.name}</h2>
        <OpenBadge hours={business.hours} detailed />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat icon={Package} label="Publicados" value={available} />
        <Stat icon={EyeOff} label="No disponibles" value={products.length - available} />
        <Stat icon={Star} label="Destacados" value={products.filter((p) => p.featured).length} />
        <Stat icon={Images} label="Fotos en galería" value={business.gallery.length} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg">Pedidos de hoy</CardTitle>
          <CardDescription>Los nuevos aparecen al instante en Pedidos.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-x-8 gap-y-3">
          {(() => {
            const list = orders.data ?? [];
            const valid = list.filter((o) => o.status !== 'cancelled');
            const open = list.filter((o) => !FINAL_STATUSES.includes(o.status)).length;
            return (
              <>
                <div><p className="font-display text-3xl font-bold tabular-nums">{list.length}</p><p className="text-sm text-muted-foreground">recibidos</p></div>
                <div><p className="font-display text-3xl font-bold tabular-nums">{open}</p><p className="text-sm text-muted-foreground">por atender</p></div>
                <div><p className="font-display text-3xl font-bold tabular-nums">{formatPrice(valid.reduce((sum, o) => sum + o.total, 0))}</p><p className="text-sm text-muted-foreground">vendido</p></div>
                <Button asChild variant="outline" className="sm:ml-auto"><Link to="/dashboard/orders">Ver pedidos</Link></Button>
              </>
            );
          })()}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg">Tu página pública</CardTitle>
          <CardDescription>Compartila en tus redes y con tus clientes.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 sm:flex-row">
          <code className="min-w-0 flex-1 truncate rounded-lg bg-secondary px-3 py-2.5 text-sm">{publicUrl}</code>
          <div className="flex gap-2">
            <Button variant="outline" onClick={copy}><Copy /> Copiar</Button>
            <Button onClick={share}><Share2 /> Compartir</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg">{done === steps.length ? 'Tu perfil está completo' : 'Completá tu perfil'}</CardTitle>
          <CardDescription>{done} de {steps.length} pasos. Los perfiles completos reciben más pedidos.</CardDescription>
          <Progress value={(done / steps.length) * 100} className="mt-2" aria-label="Perfil completo" />
        </CardHeader>
        <CardContent>
          <ul className="divide-y">
            {steps.map((step) => (
              <li key={step.key}>
                <Link to={step.to} className="flex items-center gap-3 py-2.5 text-sm hover:text-primary">
                  <span className={`flex size-5 shrink-0 items-center justify-center rounded-full border ${step.done ? 'border-primary bg-primary text-primary-foreground' : ''}`}>
                    {step.done && <Check className="size-3" />}
                  </span>
                  <span className={`flex-1 ${step.done ? 'text-muted-foreground line-through' : 'font-medium'}`}>{step.label}</span>
                  {!step.done && <ChevronRight className="size-4 text-muted-foreground" />}
                </Link>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
