import { AtSign, BadgeCheck, Bike, Clock, CreditCard, Globe, MapPin, MessageCircle, PackageOpen, Search, Share2, Store } from 'lucide-react';
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { DAYS, DAY_LABELS, fold, formatDayHours, PAYMENT_LABELS, todayKey } from '@shared/business';
import type { Business, Product } from '@shared/types';
import { GalleryLightbox } from '@/components/business/GalleryLightbox';
import { OpenBadge } from '@/components/business/OpenBadge';
import { ParallaxCover } from '@/components/business/ParallaxCover';
import { SafeImage } from '@/components/common/SafeImage';
import { EmptyState, ErrorState } from '@/components/common/States';
import { ProductCard } from '@/components/product/ProductCard';
import { ProductDialog } from '@/components/product/ProductDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useFetch } from '@/hooks/useFetch';
import { useTitle } from '@/hooks/useTitle';
import { formatPrice, whatsappUrl } from '@/lib/format';
import { whatsappLinkProps } from '@/lib/whatsapp';
import NotFound from './NotFound';

const BusinessMap = lazy(() => import('@/components/business/BusinessMap'));

function InfoBlock({ icon: Icon, title, children }: { icon: typeof Clock; title: string; children: React.ReactNode }) {
  return (
    <Card className="gap-3 rounded-2xl py-4 shadow-none">
      <CardHeader className="border-b px-4 [.border-b]:pb-3">
        <CardTitle role="heading" aria-level={2} className="flex items-center gap-2 font-sans text-sm"><Icon className="size-4 text-primary" /> {title}</CardTitle>
      </CardHeader>
      <CardContent className="px-4 text-sm">{children}</CardContent>
    </Card>
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
  const location = useLocation();
  const navigate = useNavigate();
  const openProductId = (location.state as { openProductId?: string } | null)?.openProductId;
  const { data: business, error, loading, reload } = useFetch<Business>(`/businesses/${slug}`);
  const [selected, setSelected] = useState<Product | null>(null);
  const [search, setSearch] = useState('');
  const [photo, setPhoto] = useState<number | null>(null);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [stickyHeight, setStickyHeight] = useState(0);
  const stickyRef = useRef<HTMLDivElement>(null);
  const tagsRef = useRef<HTMLElement>(null);
  const stickyHeightRef = useRef(0);
  stickyHeightRef.current = stickyHeight;
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

  // Highlights the tag of the section on screen as the page scrolls: the last section whose top has
  // passed a line at 35% of the viewport. Sections are in page order, so the tag does not flicker at
  // the border between two of them: it changes once the next one is clearly in.
  useEffect(() => {
    let raf = 0;
    let current: string | null = null;

    const update = () => {
      raf = 0;
      // Measured against the viewport: offsetTop is relative to the nearest positioned ancestor, not the page.
      // Never above the sticky bars (navbar + search + tags), which are taller than that on phones.
      const trigger = Math.max(window.innerHeight * 0.35, 64 + stickyHeightRef.current + 32);
      let next: string | null = null;
      for (const s of sections) {
        const el = document.getElementById(`section-${s.id}`);
        if (!el) continue;
        if (el.getBoundingClientRect().top <= trigger) next = s.id;
        else break;
      }
      // At the bottom of the page the last sections may never reach the trigger line: the last one wins.
      if (sections.length && window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4) next = sections[sections.length - 1].id;
      if (next && next !== current) {
        current = next;
        setActiveSection(next);
      }
    };

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    update();
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
    };
  }, [sections]);

  // Measures the sticky bar (search + tags) so sections stop right under it when scrolled to,
  // also from a tag. It exists only once the business has loaded, and its height can change
  // (tags wrap, the window resizes), hence the ResizeObserver.
  useEffect(() => {
    const el = stickyRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setStickyHeight(el.offsetHeight));
    observer.observe(el);
    return () => observer.disconnect();
  }, [business]);

  // Keeps the active tag in sight: when it is not comfortably visible in the horizontal list, the list
  // (and only the list, not the page) glides to center it.
  useEffect(() => {
    const nav = tagsRef.current;
    const tag = activeSection ? nav?.querySelector<HTMLElement>(`a[href="#section-${activeSection}"]`) : null;
    if (!nav || !tag) return;
    const margin = 32;
    // Position of the tag inside the scrollable list, in the list's own coordinates.
    const left = tag.getBoundingClientRect().left - nav.getBoundingClientRect().left + nav.scrollLeft;
    const right = left + tag.offsetWidth;
    if (left >= nav.scrollLeft + margin && right <= nav.scrollLeft + nav.clientWidth - margin) return;
    const to = Math.max(0, Math.min(left - (nav.clientWidth - tag.offsetWidth) / 2, nav.scrollWidth - nav.clientWidth));
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      nav.scrollLeft = to;
      return;
    }
    // Animated by hand: a native smooth scroll here would cancel the page's own smooth scroll
    // after a tag is clicked (Chrome runs one programmatic smooth scroll at a time).
    const from = nav.scrollLeft;
    const start = performance.now();
    let frame = requestAnimationFrame(function step(now) {
      const t = Math.min(1, (now - start) / 380);
      nav.scrollLeft = from + (to - from) * (1 - (1 - t) ** 3);
      if (t < 1) frame = requestAnimationFrame(step);
    });
    return () => cancelAnimationFrame(frame);
  }, [activeSection]);

  // Coming from the global search with a product: glide to its section, then open its detail once the
  // scroll ends. The request lives in the navigation state and is cleared once handled, so neither a
  // reload nor going back opens the product again.
  useEffect(() => {
    // While moving from one business to another, the previous one stays loaded until the new one
    // arrives: wait for the right business, or the product would not be found and the request lost.
    if (!business || !openProductId || business.slug !== slug) return;
    const product = business.products?.find((p) => p.id === openProductId);
    // Clearing the state re-runs this effect (and its cleanup), so it is done only once nothing is pending.
    const clearRequest = () => navigate(`${location.pathname}${location.search}`, { replace: true, state: null });
    const open = () => {
      setSelected(product ?? null);
      clearRequest();
    };
    if (!product) {
      clearRequest();
      return;
    }
    setSearch('');
    setSelected(null);
    const sectionId = product.category?.id ?? 'other';
    let frame = 0;
    // Short pause so the page has rendered (and the visitor sees where they landed) before moving.
    const timer = setTimeout(() => {
      const el = document.getElementById(`section-${sectionId}`);
      if (!el) return open();
      setActiveSection(sectionId);
      const offset = 64 + (stickyRef.current?.offsetHeight ?? 0) + 8;
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      const to = Math.max(0, Math.min(el.getBoundingClientRect().top + window.scrollY - offset, maxScroll));
      const from = window.scrollY;
      const distance = to - from;
      if (Math.abs(distance) < 4 || matchMedia('(prefers-reduced-motion: reduce)').matches) {
        window.scrollTo(0, to);
        return open();
      }
      // Animated by hand (not behavior: 'smooth') to know exactly when it ends, on every browser.
      const duration = Math.min(1100, Math.max(450, Math.abs(distance) * 0.6));
      const start = performance.now();
      frame = requestAnimationFrame(function step(now) {
        const t = Math.min(1, (now - start) / duration);
        const eased = t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2;
        window.scrollTo(0, from + distance * eased);
        if (t < 1) frame = requestAnimationFrame(step);
        else open();
      });
    }, 250);
    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(frame);
    };
  }, [business, openProductId, slug]);

  const scrollMargin = `calc(64px + ${stickyHeight}px)`;

  if (loading && !business) {
    return (
      <div className="mx-auto max-w-page px-4 py-6">
        <Skeleton className="h-52 w-full rounded-2xl sm:h-72" />
        <Skeleton className="mt-6 h-8 w-1/2" />
        <Skeleton className="mt-3 h-4 w-1/3" />
      </div>
    );
  }
  if (error?.includes('no está disponible')) {
    return <div className="mx-auto max-w-xl px-4 py-16"><EmptyState icon={Store} title="Este negocio no está disponible" description="Por ahora no aparece en Detoke. Mirá otros comercios del barrio." action={<Button asChild><Link to="/explorar">Explorar negocios</Link></Button>} /></div>;
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
      <ParallaxCover src={business.coverImage} className="h-52 w-full sm:h-72" />
      <div className="mx-auto max-w-page px-4 sm:pt-6">

        <header className="relative -mt-6">
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
              <Button asChild className="flex-1 sm:flex-none"><a href={whatsappUrl(business.whatsapp)} {...whatsappLinkProps()}><MessageCircle /> WhatsApp</a></Button>
              <Button variant="outline" size="icon" aria-label="Compartir" onClick={share}><Share2 className="size-4" /></Button>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <OpenBadge hours={business.hours} detailed />
            {business.tagline && <p className="text-sm font-medium">{business.tagline}</p>}
          </div>
          {business.description && <p className="mt-3 max-w-3xl text-muted-foreground">{business.description}</p>}
        </header>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
          <div className="min-w-0">
            <div className="sticky top-16 z-20 -mx-4 bg-background/95 px-4 pb-3 pt-3 backdrop-blur sm:mx-0 sm:px-0" ref={stickyRef}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input noAutofill value={search} onChange={(e) => setSearch(e.target.value)} placeholder={`Buscar en ${business.name}`} className="bg-card pl-9" aria-label="Buscar productos" />
              </div>
              {sections.length > 1 && (
                <nav ref={tagsRef} aria-label="Categorías de productos" className="mt-2 flex gap-1.5 overflow-x-auto [scrollbar-width:none]">
                  {sections.map((s) => (
                    <a
                      key={s.id}
                      href={`#section-${s.id}`}
                      onClick={(e) => {
                        e.preventDefault();
                        setActiveSection(s.id);
                        const el = document.getElementById(`section-${s.id}`);
                        // Exact landing right under the sticky bars (scrollIntoView would also add the page's
                        // scroll-padding and stop lower than that).
                        if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - (64 + stickyHeight + 8), behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
                      }}
                      className={`shrink-0 rounded-full px-3 py-1 text-sm font-medium transition-colors ${activeSection === s.id ? 'bg-primary text-primary-foreground hover:bg-primary' : 'bg-secondary hover:bg-accent'}`}
                    >
                      {s.name}
                    </a>
                  ))}
                </nav>
              )}
            </div>

            {sections.length === 0 ? (
              <EmptyState icon={PackageOpen} title={search ? 'No encontramos ese producto' : 'Todavía no hay productos publicados'} description={search ? 'Probá con otra palabra.' : 'Podés consultar por WhatsApp.'} />
            ) : sections.map((section) => (
              <section key={section.id} id={`section-${section.id}`} className="mt-8" style={{ scrollMarginTop: scrollMargin }}>
                <h2 className="mb-4 mt-6 text-xl font-bold border-b border-foreground/20 dark:border-foreground/8 pb-2">{section.name}</h2>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
                  {section.products.map((p) => <ProductCard key={p.id} product={p} business={business} onOpen={() => setSelected(p)} />)}
                </div>
              </section>
            ))}

            {business.gallery.length > 0 && (
              <Card className="mt-12 gap-4 rounded-2xl py-4 shadow-none sm:py-6">
                <CardHeader className="border-b px-4 sm:px-6 [.border-b]:pb-4">
                  <CardTitle role="heading" aria-level={2}>Galería</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-3 gap-2 px-4 sm:gap-3 sm:px-6">
                  {business.gallery.map((src, i) => (
                    <button key={src} onClick={() => setPhoto(i)} className="cursor-pointer overflow-hidden rounded-xl" aria-label="Ampliar foto">
                      <SafeImage src={src} alt="" className="aspect-square w-full transition-transform hover:scale-105" />
                    </button>
                  ))}
                </CardContent>
              </Card>
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
                <p>{[business.address, business.neighborhood, business.city, business.province && !business.province.includes(business.city ?? '\u0000') && !(business.city ?? '').includes('Buenos Aires') ? business.province : null].filter(Boolean).join(', ')}</p>
                {business.latitude != null && business.longitude != null && (
                  <div className="mt-3">
                    <Suspense fallback={<Skeleton className="h-48 w-full rounded-xl" />}><BusinessMap latitude={business.latitude} longitude={business.longitude} /></Suspense>
                    <Button asChild variant="link" className="mt-1 h-auto p-0">
                      <a href={`https://www.google.com/maps/dir/?api=1&destination=${business.latitude},${business.longitude}`} target="_blank" rel="noopener noreferrer" className="cursor-pointer">Cómo llegar</a>
                    </Button>
                  </div>
                )}
              </InfoBlock>
            )}
            {(business.website || business.instagram) && (
              <div className="flex gap-2">
                {business.website && <Button asChild variant="outline" size="sm"><a href={business.website} rel="noreferrer"><Globe /> Sitio web</a></Button>}
                {business.instagram && <Button asChild variant="outline" size="sm"><a href={`https://instagram.com/${business.instagram}`} rel="noreferrer"><AtSign /> Instagram</a></Button>}
              </div>
            )}
          </aside>
        </div>

        <ProductDialog product={selected} business={business} onClose={() => setSelected(null)} />
        <GalleryLightbox photos={business.gallery} start={photo} onClose={() => setPhoto(null)} title={business.name} />
      </div>
    </>
  );
}
