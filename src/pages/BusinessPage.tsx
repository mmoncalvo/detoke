import { AtSign, BadgeCheck, Bike, Clock, CreditCard, Globe, MapPin, MessageCircle, PackageOpen, Search, Share2, Store } from 'lucide-react';
import { lazy, Suspense, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { DAYS, DAY_LABELS, fold, formatDayHours, PAYMENT_LABELS, todayKey } from '@shared/business';
import type { Business, Product } from '@shared/types';
import { OpenBadge } from '@/components/business/OpenBadge';
import { SafeImage } from '@/components/common/SafeImage';
import { EmptyState, ErrorState } from '@/components/common/States';
import { ProductCard } from '@/components/product/ProductCard';
import { ProductDialog } from '@/components/product/ProductDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useFetch } from '@/hooks/useFetch';
import { useTitle } from '@/hooks/useTitle';
import { formatPrice, whatsappUrl } from '@/lib/format';
import { imageUrl } from '@/lib/images';
import NotFound from './NotFound';

const BusinessMap = lazy(() => import('@/components/business/BusinessMap'));

function InfoBlock({ icon: Icon, title, children }: { icon: typeof Clock; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border bg-card p-4">
      <h2 className="mb-2 flex items-center gap-2 font-sans text-sm font-semibold"><Icon className="size-4 text-primary" /> {title}</h2>
      <div className="text-sm">{children}</div>
    </section>
  );
}

function DeliveryInfo({ business }: { business: Business }) {
  const delivers = business.deliveryOptions.includes('delivery');
  const rows: [string, string][] = [];
  if (delivers) {
    rows.push(['Envío', business.deliveryFee ? formatPrice(business.deliveryFee) : 'Gratis']);
    if (business.minimumOrder) rows.push(['Pedido mínimo', formatPrice(business.minimumOrder)]);
    if (business.deliveryRadiusKm) rows.push(['Zona', `Hasta ${business.deliveryRadiusKm} km`]);
  }
  return (
    <>
      <div className="flex flex-wrap gap-1.5">
        {delivers && <Badge variant="accent"><Bike className="size-3.5" /> Delivery</Badge>}
        {business.deliveryOptions.includes('pickup') && <Badge variant="secondary"><Store className="size-3.5" /> Retiro en el local</Badge>}
      </div>
      {rows.length > 0 && (
        <dl className="mt-3 space-y-1">
          {rows.map(([label, value]) => <div key={label} className="flex justify-between gap-2"><dt className="text-muted-foreground">{label}</dt><dd className="font-medium">{value}</dd></div>)}
        </dl>
      )}
    </>
  );
}

export default function BusinessPage() {
  const { slug } = useParams();
  const { data: business, error, loading, reload } = useFetch<Business>(`/businesses/${slug}`);
  const [selected, setSelected] = useState<Product | null>(null);
  const [search, setSearch] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  useTitle(business?.name);

  const sections = useMemo(() => {
    const term = fold(search.trim());
    const groups = new Map<string, { id: string; name: string; position: number; products: Product[] }>();
    for (const product of business?.products ?? []) {
      if (term && !fold(product.name).includes(term)) continue;
      const key = product.category?.id ?? 'other';
      const group = groups.get(key) ?? { id: key, name: product.category?.name ?? 'Otros', position: product.category?.position ?? Infinity, products: [] };
      group.products.push(product);
      groups.set(key, group);
    }
    return [...groups.values()].sort((a, b) => a.position - b.position);
  }, [business, search]);

  if (loading && !business) {
    return (
      <div className="mx-auto max-w-page px-4 py-6">
        <Skeleton className="h-52 w-full rounded-2xl sm:h-72" />
        <Skeleton className="mt-6 h-8 w-1/2" />
        <Skeleton className="mt-3 h-4 w-1/3" />
      </div>
    );
  }
  if (error) return error.includes('No encontramos') ? <NotFound /> : <div className="mx-auto max-w-xl px-4 py-16"><ErrorState message={error} onRetry={reload} /></div>;
  if (!business) return null;

  const today = todayKey();
  const share = async () => {
    const url = window.location.href;
    if (navigator.share) return navigator.share({ title: business.name, url }).catch(() => undefined);
    await navigator.clipboard.writeText(url);
    toast.success('Enlace copiado');
  };

  return (
    <>
      <div className="relative">
        <SafeImage src={business.coverImage} alt="" className="h-52 w-full sm:h-72" />
      </div>
      <div className="mx-auto max-w-page px-0 sm:px-4 sm:pt-6">

        <header className="relative px-4 sm:px-6 -mt-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-5 my-6">
            <SafeImage src={business.logo} alt={`Logo de ${business.name}`} className="relative -mt-16 size-32 shrink-0 rounded-2xl border-4 border-background shadow-sm" />
            <div className="min-w-0 flex-1">
              <h1 className="flex items-start gap-2 text-3xl font-extrabold sm:text-4xl">
                {business.name}
                {business.isVerified && <BadgeCheck className="size-6 shrink-0 text-primary m-2" aria-label="Negocio verificado" />}
              </h1>
              <p className="text-muted-foreground">{[business.category?.name, business.neighborhood].filter(Boolean).join(' · ')}</p>
            </div>
            <div className="flex gap-2">
              <Button asChild className="flex-1 sm:flex-none"><a href={whatsappUrl(business.whatsapp)} target="_blank" rel="noreferrer"><MessageCircle /> WhatsApp</a></Button>
              <Button variant="outline" size="icon" aria-label="Compartir" onClick={share}><Share2 className="size-4" /></Button>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <OpenBadge hours={business.hours} detailed />
            {business.tagline && <p className="text-sm font-medium">{business.tagline}</p>}
          </div>
          {business.description && <p className="mt-3 max-w-3xl text-muted-foreground">{business.description}</p>}
        </header>

        <div className="mt-8 grid gap-8 px-4 sm:px-6 lg:grid-cols-[1fr_320px]">
          <div className="min-w-0">
            <div className="sticky top-16 z-20 -mx-4 bg-background/95 px-4 pb-3 pt-3 backdrop-blur sm:mx-0 sm:px-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={`Buscar en ${business.name}`} className="bg-card pl-9" aria-label="Buscar productos" />
              </div>
              {sections.length > 1 && (
                <nav aria-label="Categorías de productos" className="mt-2 flex gap-1.5 overflow-x-auto [scrollbar-width:none]">
                  {sections.map((s) => <a key={s.id} href={`#section-${s.id}`} className="shrink-0 rounded-full bg-secondary px-3 py-1 text-sm font-medium hover:bg-accent">{s.name}</a>)}
                </nav>
              )}
            </div>

            {sections.length === 0 ? (
              <EmptyState icon={PackageOpen} title={search ? 'No encontramos ese producto' : 'Todavía no hay productos publicados'} description={search ? 'Probá con otra palabra.' : 'Podés consultar por WhatsApp.'} />
            ) : sections.map((section) => (
              <section key={section.id} id={`section-${section.id}`} className="mt-5">
                <h2 className="mb-3 text-xl font-bold">{section.name}</h2>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
                  {section.products.map((p) => <ProductCard key={p.id} product={p} business={business} onOpen={() => setSelected(p)} />)}
                </div>
              </section>
            ))}

            {business.gallery.length > 0 && (
              <section className="mt-10">
                <h2 className="mb-3 text-xl font-bold">Galería</h2>
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  {business.gallery.map((src) => (
                    <button key={src} onClick={() => setPhoto(src)} className="overflow-hidden rounded-xl" aria-label="Ampliar foto">
                      <SafeImage src={src} alt="" className="aspect-square w-full transition-transform hover:scale-105" />
                    </button>
                  ))}
                </div>
              </section>
            )}
          </div>

          <aside className="space-y-3 lg:sticky lg:top-20 lg:self-start">
            <InfoBlock icon={Clock} title="Horarios">
              <ul className="space-y-1">
                {DAYS.map((day) => (
                  <li key={day} className={`flex justify-between gap-3 ${day === today ? 'font-semibold' : 'text-muted-foreground'}`}>
                    <span>{DAY_LABELS[day]}</span>
                    <span className="text-right">{formatDayHours(business.hours[day])}</span>
                  </li>
                ))}
              </ul>
            </InfoBlock>
            <InfoBlock icon={Bike} title="Entrega"><DeliveryInfo business={business} /></InfoBlock>
            <InfoBlock icon={CreditCard} title="Medios de pago">
              <div className="flex flex-wrap gap-1.5">{business.paymentMethods.map((m) => <Badge key={m} variant="secondary">{PAYMENT_LABELS[m]}</Badge>)}</div>
            </InfoBlock>
            {(business.address || business.latitude != null) && (
              <InfoBlock icon={MapPin} title="Dónde estamos">
                <p>{[business.address, business.neighborhood, business.city].filter(Boolean).join(', ')}</p>
                {business.latitude != null && business.longitude != null && (
                  <div className="mt-3">
                    <Suspense fallback={<Skeleton className="h-48 w-full rounded-xl" />}><BusinessMap latitude={business.latitude} longitude={business.longitude} /></Suspense>
                    <Button asChild variant="link" className="mt-1 h-auto p-0">
                      <a href={`https://www.google.com/maps/dir/?api=1&destination=${business.latitude},${business.longitude}`} target="_blank" rel="noreferrer">Cómo llegar</a>
                    </Button>
                  </div>
                )}
              </InfoBlock>
            )}
            {(business.website || business.instagram) && (
              <div className="flex gap-2">
                {business.website && <Button asChild variant="outline" size="sm"><a href={business.website} target="_blank" rel="noreferrer"><Globe /> Sitio web</a></Button>}
                {business.instagram && <Button asChild variant="outline" size="sm"><a href={`https://instagram.com/${business.instagram}`} target="_blank" rel="noreferrer"><AtSign /> Instagram</a></Button>}
              </div>
            )}
          </aside>
        </div>

        <ProductDialog product={selected} business={business} onClose={() => setSelected(null)} />
        <Dialog open={!!photo} onOpenChange={(open) => !open && setPhoto(null)}>
          <DialogContent className="max-w-3xl p-2">
            <DialogTitle className="sr-only">Foto de {business.name}</DialogTitle>
            <DialogDescription className="sr-only">Foto ampliada de la galería</DialogDescription>
            {photo && <img src={imageUrl(photo)} alt="" className="max-h-[80svh] w-full rounded-md object-contain" />}
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}
