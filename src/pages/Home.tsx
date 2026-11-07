import { ArrowRight, Search, Store } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { openStatus } from '@shared/business';
import type { Business, BusinessCategory, Product } from '@shared/types';
import { BusinessCard, BusinessCardSkeleton } from '@/components/business/BusinessCard';
import { ErrorState } from '@/components/common/States';
import { ProductCard, ProductCardSkeleton } from '@/components/product/ProductCard';
import { ProductDialog } from '@/components/product/ProductDialog';
import { Button } from '@/components/ui/button';
import { useFetch } from '@/hooks/useFetch';
import { useTitle } from '@/hooks/useTitle';
import { categoryIcon } from '@/lib/category-icons';

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
    return { list: (open.length >= 3 ? open : all).slice(0, 6), anyOpen: open.length >= 3 };
  }, [businesses.data]);

  const featured = useMemo(() => {
    const seen = new Set<string>();
    return (products.data ?? []).filter((p) => (seen.has(p.businessId) ? false : seen.add(p.businessId))).slice(0, 10);
  }, [products.data]);

  return (
    <>
      <section className="relative overflow-hidden bg-primary text-primary-foreground">
        <div className="awning" aria-hidden style={{ background: 'repeating-linear-gradient(90deg, var(--mustard) 0 32px, var(--background) 32px 64px)' }} />
        <div className="mx-auto max-w-6xl px-4 pb-14 pt-10 sm:pb-20 sm:pt-14">
          <h1 className="max-w-2xl text-4xl font-extrabold leading-[1.05] sm:text-6xl">Todo lo del barrio, de toque.</h1>
          <p className="mt-4 max-w-xl text-lg opacity-85">Mirá qué tienen hoy los comercios de tu zona y hacé tu pedido directo por WhatsApp.</p>
          <form
            className="mt-7 flex max-w-xl items-center gap-2 rounded-xl bg-card p-1.5 shadow-xl shadow-black/15"
            role="search"
            onSubmit={(e) => { e.preventDefault(); navigate(`/explorar?search=${encodeURIComponent(query)}`); }}
          >
            <Search className="ml-2.5 size-5 shrink-0 text-muted-foreground" />
            <label htmlFor="home-search" className="sr-only">Buscar negocios</label>
            <input
              id="home-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="¿Qué estás buscando?"
              className="h-11 min-w-0 flex-1 bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground"
            />
            <Button type="submit" size="lg">Buscar</Button>
          </form>
        </div>
      </section>

      <div className="mx-auto max-w-6xl space-y-14 px-4 pt-8">
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
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {businesses.loading ? Array.from({ length: 6 }, (_, i) => <BusinessCardSkeleton key={i} />) : list.map((b) => <BusinessCard key={b.id} business={b} />)}
            </div>
          )}
        </section>

        <section>
          <SectionHeader title="Lo más pedido" subtitle="Una selección de los destacados de cada comercio." to="/explorar?tab=products" />
          {products.error ? <ErrorState message={products.error} onRetry={products.reload} /> : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {products.loading ? Array.from({ length: 5 }, (_, i) => <ProductCardSkeleton key={i} />) : featured.map((p) => p.business && <ProductCard key={p.id} product={p} business={p.business} showBusiness onOpen={() => setSelected(p)} />)}
            </div>
          )}
        </section>

        <section className="flex flex-col items-start justify-between gap-5 rounded-3xl bg-accent p-7 text-accent-foreground sm:flex-row sm:items-center sm:p-10">
          <div>
            <h2 className="text-2xl font-bold sm:text-3xl">¿Tenés un comercio?</h2>
            <p className="mt-1 max-w-lg">Publicá tu catálogo gratis en minutos y recibí los pedidos en tu WhatsApp, sin comisiones.</p>
          </div>
          <Button asChild size="lg" className="shrink-0"><Link to="/register"><Store /> Sumá tu negocio</Link></Button>
        </section>
      </div>

      <ProductDialog product={selected} onClose={() => setSelected(null)} />
    </>
  );
}
