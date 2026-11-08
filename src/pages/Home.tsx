import { ArrowRight, Search, Store } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { openStatus } from '@shared/business';
import type { Business, BusinessCategory, Product } from '@shared/types';
import { BusinessCard, BusinessCardSkeleton } from '@/components/business/BusinessCard';
import { SafeImage } from '@/components/common/SafeImage';
import { ErrorState } from '@/components/common/States';
import { ProductCard, ProductCardSkeleton } from '@/components/product/ProductCard';
import { ProductDialog } from '@/components/product/ProductDialog';
import { Button } from '@/components/ui/button';
import { useFetch } from '@/hooks/useFetch';
import { useTitle } from '@/hooks/useTitle';
import { categoryIcon } from '@/lib/category-icons';
import { Awning } from '@/components/common/Awning';
import { NO_AUTOFILL } from '@/components/ui/input';

function SectionHeader({ title, subtitle, to }: { title: string; subtitle?: string; to: string }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div>
        <h2 className="text-2xl font-bold sm:text-3xl">{title}</h2>
        {subtitle && <p className="mt-1 text-muted-foreground">{subtitle}</p>}
      </div>
      <Button asChild variant="ghost" className="shrink-0 text-primary"><Link to={to}>Ver todo <ArrowRight /></Link></Button>
    </div>
  );
}

export default function Home() {
  useTitle();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const categories = useFetch<BusinessCategory[]>('/business-categories');
  const businesses = useFetch<Business[]>('/businesses');
  const products = useFetch<Product[]>('/products?featured=true');
  const [selected, setSelected] = useState<Product | null>(null);

  const { list, anyOpen } = useMemo(() => {
    const all = businesses.data ?? [];
    const open = all.filter((b) => openStatus(b.hours).isOpen);
    return { list: (open.length >= 3 ? open : all).slice(0, 8), anyOpen: open.length >= 3 };
  }, [businesses.data]);

  const featured = useMemo(() => {
    // One product per business and per photo, so the shelf does not repeat itself.
    const seen = new Set<string>();
    const isNew = (key: string) => !seen.has(key) && !!seen.add(key);
    const shuffled = [...(products.data ?? [])].sort((a, b) => a.id.localeCompare(b.id));
    return shuffled.filter((p) => !seen.has(p.businessId) && isNew(p.images[0] ?? p.id) && isNew(p.businessId)).slice(0, 12);
  }, [products.data]);

  return (
    <>
      <section className="relative overflow-hidden bg-sidebar text-sidebar-accent-foreground">
        <Awning />
        <div className="relative mx-auto max-w-page px-4 pb-16 pt-10 sm:pb-24 sm:pt-16">
          <div className="pointer-events-none absolute -bottom-6 right-4 hidden w-[400px] lg:block" aria-hidden>
            <SafeImage src="pizza_napolitana.jpg" alt="" className="absolute bottom-28 right-44 size-52 -rotate-6 rounded-2xl border-4 border-sidebar-accent-foreground/90 shadow-2xl" />
            <SafeImage src="panaderia_cover.jpg" alt="" className="absolute bottom-44 right-0 size-44 rotate-3 rounded-2xl border-4 border-sidebar-accent-foreground/90 shadow-2xl" />
            <SafeImage src="verduleria_cover.jpg" alt="" className="absolute bottom-6 right-14 size-44 rotate-[-2deg] rounded-2xl border-4 border-sidebar-accent-foreground/90 shadow-2xl" />
          </div>
          <p className="relative inline-flex items-center gap-2 rounded-full bg-sidebar-accent px-3 py-1 text-sm font-medium text-mustard">
            <span className="size-1.5 rounded-full bg-mustard" aria-hidden /> Comercios de cercanía
          </p>
          <h1 className="relative mt-4 max-w-2xl text-[2.6rem] font-extrabold leading-[1.02] sm:text-6xl lg:text-7xl">
            Todo el barrio, <span className="text-mustard block">de toque.</span>
          </h1>
          <p className="relative mt-5 max-w-lg text-base text-sidebar-foreground sm:text-lg">Mirá qué tienen hoy los comercios de tu zona y hacé tu pedido directo por WhatsApp.</p>
          <form
            className="relative mt-8 flex max-w-xl cursor-text items-center gap-2 rounded-xl bg-card p-1.5 shadow-2xl shadow-black/25"
            role="search"
            onSubmit={(e) => { e.preventDefault(); navigate(`/explorar?search=${encodeURIComponent(query)}`); }}
            onClick={(e) => {
              // Any empty spot of the box puts the cursor in the field.
              if (!(e.target as HTMLElement).closest('button')) document.getElementById('home-search')?.focus();
            }}
          >
            <label htmlFor="home-search" className="flex h-11 cursor-pointer items-center pl-2.5 pr-1">
              <Search className="size-5 shrink-0 text-muted-foreground" />
              <span className="sr-only">Buscar negocios</span>
            </label>
            <input
              id="home-search"
              type="search"
              name="detoke-home-query"
              {...NO_AUTOFILL}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="¿Qué estás buscando?"
              className="h-11 min-w-0 flex-1 bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground [&::-webkit-search-cancel-button]:hidden"
            />
            <Button type="submit" size="lg">Buscar</Button>
          </form>
          <div className="relative mt-4 flex flex-wrap gap-2 text-sm">
            <Link to="/explorar?open=true" className="rounded-full border border-sidebar-border px-3 py-1.5 text-sidebar-foreground transition-colors hover:border-mustard hover:text-sidebar-accent-foreground">Abierto ahora</Link>
            <Link to="/explorar?delivery=true" className="rounded-full border border-sidebar-border px-3 py-1.5 text-sidebar-foreground transition-colors hover:border-mustard hover:text-sidebar-accent-foreground">Con delivery</Link>
            <Link to="/explorar?tab=products" className="rounded-full border border-sidebar-border px-3 py-1.5 text-sidebar-foreground transition-colors hover:border-mustard hover:text-sidebar-accent-foreground">Ver productos</Link>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-page space-y-14 px-4 pt-8">
        <nav aria-label="Rubros" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
          {(categories.data ?? []).filter((c) => (c.businessCount ?? 0) > 0).map((category) => {
            const Icon = categoryIcon(category.icon);
            return (
              <Link key={category.id} to={`/explorar?category=${category.slug}`} className="flex shrink-0 items-center gap-2 rounded-full border bg-card px-4 py-2 text-sm font-medium transition-colors hover:border-primary hover:text-primary">
                <Icon className="size-4" /> {category.name}
              </Link>
            );
          })}
        </nav>

        <section>
          <SectionHeader title={anyOpen ? 'Abierto ahora' : 'Negocios del barrio'} subtitle={anyOpen ? 'Comercios que te atienden en este momento.' : 'A esta hora casi todos descansan, pero podés mirar sus catálogos.'} to={anyOpen ? '/explorar?open=true' : '/explorar'} />
          {businesses.error ? <ErrorState message={businesses.error} onRetry={businesses.reload} /> : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {businesses.loading ? Array.from({ length: 8 }, (_, i) => <BusinessCardSkeleton key={i} />) : list.map((b) => <BusinessCard key={b.id} business={b} />)}
            </div>
          )}
        </section>

        <section>
          <SectionHeader title="Lo más pedido" subtitle="Una selección de los destacados de cada comercio." to="/explorar?tab=products" />
          {products.error ? <ErrorState message={products.error} onRetry={products.reload} /> : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
              {products.loading ? Array.from({ length: 6 }, (_, i) => <ProductCardSkeleton key={i} />) : featured.map((p) => p.business && <ProductCard key={p.id} product={p} business={p.business} showBusiness onOpen={() => setSelected(p)} />)}
            </div>
          )}
        </section>

        <section className="flex flex-col items-start justify-between gap-5 rounded-3xl bg-accent p-7 text-accent-foreground sm:flex-row sm:items-center sm:p-10">
          <div>
            <h2 className="text-2xl font-bold sm:text-3xl">¿Tenés un comercio?</h2>
            <p className="mt-1 max-w-lg">Publicá tu catálogo gratis en minutos y recibí los pedidos en tu WhatsApp, sin comisiones.</p>
          </div>
          <Button asChild size="lg" className="shrink-0"><Link to="/register?type=business"><Store /> Sumá tu negocio</Link></Button>
        </section>
      </div>

      <ProductDialog product={selected} onClose={() => setSelected(null)} />
    </>
  );
}
