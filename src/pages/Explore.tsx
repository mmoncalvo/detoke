import { PackageSearch, Search, SearchX, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { Business, BusinessCategory, Product, ProductCategory } from '@shared/types';
import { BusinessCard, BusinessCardSkeleton } from '@/components/business/BusinessCard';
import { EmptyState, ErrorState } from '@/components/common/States';
import { ProductCard, ProductCardSkeleton } from '@/components/product/ProductCard';
import { ProductDialog } from '@/components/product/ProductDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useFetch } from '@/hooks/useFetch';
import { useTitle } from '@/hooks/useTitle';
import { categoryIcon } from '@/lib/category-icons';

const PAGE_SIZE = 20;

function Chip({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${active ? 'border-primary bg-primary text-primary-foreground' : 'bg-card hover:border-primary/50'}`}
    >
      {children}
    </button>
  );
}

export default function Explore() {
  useTitle('Explorar');
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'products' ? 'products' : 'businesses';
  const category = params.get('category') ?? '';
  const open = params.get('open') === 'true';
  const delivery = params.get('delivery') === 'true';
  const search = params.get('search') ?? '';

  const [text, setText] = useState(search);
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [selected, setSelected] = useState<Product | null>(null);
  const chipContainer = useRef<HTMLDivElement>(null);

  const update = (changes: Record<string, string | null>) => {
    setParams((current) => {
      const next = new URLSearchParams(current);
      for (const [key, value] of Object.entries(changes)) {
        if (value) next.set(key, value);
        else next.delete(key);
      }
      return next;
    }, { replace: true });
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (text !== search) update({ search: text || null });
    }, 250);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  useEffect(() => setVisible(PAGE_SIZE), [tab, category, open, delivery, search]);

  const businessCategories = useFetch<BusinessCategory[]>('/business-categories');
  const productCategories = useFetch<ProductCategory[]>('/product-categories');

  // When a category is picked (also when arriving from a home tag), scroll its chip into view in the
  // horizontal list so the active filter is visible.
  useEffect(() => {
    if (!chipContainer.current || !category) return;
    const active = chipContainer.current.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (active) active.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [category, tab, businessCategories.data, productCategories.data]);

  const query = useMemo(() => {
    const q = new URLSearchParams();
    if (search) q.set('search', search);
    if (category) q.set('category', category);
    if (tab === 'businesses') {
      if (open) q.set('open', 'true');
      if (delivery) q.set('delivery', 'true');
    }
    return q.toString();
  }, [tab, search, category, open, delivery]);

  const businesses = useFetch<Business[]>(tab === 'businesses' ? `/businesses?${query}` : null);
  const products = useFetch<Product[]>(tab === 'products' ? `/products?${query}` : null);

  const results = tab === 'businesses' ? businesses : products;
  const count = results.data?.length ?? 0;
  const hasFilters = !!(search || category || open || delivery);
  const clear = () => {
    setText('');
    setParams(tab === 'products' ? { tab } : {}, { replace: true });
  };

  return (
    <div className="mx-auto max-w-page px-4 py-8">
      <h1 className="text-3xl font-bold sm:text-4xl">Explorar</h1>

      <div className="mt-5 flex flex-col gap-4 md:flex-row md:items-center bg-card p-2 rounded-xl">
        <Tabs value={tab} onValueChange={(value) => update({ tab: value === 'products' ? 'products' : null, category: null })}>
          <TabsList className='size-full gap-2 min-h-10'>
            <TabsTrigger className='size-full' value="businesses">Negocios</TabsTrigger>
            <TabsTrigger className='size-full' value="products">Productos</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            noAutofill
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={tab === 'businesses' ? 'Nombre, rubro o barrio' : 'Nombre del producto'}
            className="bg-background p-4 py-2 pl-10 pr-10"
            aria-label="Buscar"
          />
          {text && (
            <button
              type="button"
              onClick={() => { setText(''); setParams((p) => { p.delete('search'); return p; }, { replace: true }); }}
              className="absolute right-4 top-1/2 -translate-y-1/2 size-5 p-0.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded-full transition-colors"
              aria-label="Borrar búsqueda"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
        {tab === 'businesses' && (
          <div className="flex flex-wrap items-center gap-x-8 gap-y-3 p-4 md:min-w-[300px] md:justify-end md:py-0">
            <div className="flex items-center gap-2">
              <Switch id="open-now" checked={open} onCheckedChange={(v) => update({ open: v ? 'true' : null })} />
              <Label htmlFor="open-now">Abierto ahora</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch id="delivery" checked={delivery} onCheckedChange={(v) => update({ delivery: v ? 'true' : null })} />
              <Label htmlFor="delivery">Con delivery</Label>
            </div>
          </div>
        )}
      </div>

      <div ref={chipContainer} className="-mx-4 my-4 flex gap-2 overflow-x-auto px-4 pb-2 [scrollbar-width:none]">
        <Chip active={!category} onClick={() => update({ category: null })}>Todos</Chip>
        {tab === 'businesses'
          ? (businessCategories.data ?? []).filter((c) => (c.businessCount ?? 0) > 0).map((c) => {
            const Icon = categoryIcon(c.icon);
            return <Chip key={c.id} active={category === c.slug} onClick={() => update({ category: c.slug })}><Icon className="size-4" /> {c.name}</Chip>;
          })
          : (productCategories.data ?? []).map((c) => <Chip key={c.id} active={category === c.slug} onClick={() => update({ category: c.slug })}>{c.name}</Chip>)}
      </div>

      <div className="mt-4 flex h-8 items-center justify-between">
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {!results.loading && !results.error && `${count} ${tab === 'businesses' ? (count === 1 ? 'negocio' : 'negocios') : count === 1 ? 'producto' : 'productos'}`}
        </p>
        {hasFilters && <Button variant="ghost" size="sm" onClick={clear}><X /> Limpiar filtros</Button>}
      </div>

      <div className="mt-2">
        {results.error ? <ErrorState message={results.error} onRetry={results.reload} /> : results.loading && !results.data ? (
          tab === 'businesses'
            ? <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{Array.from({ length: 6 }, (_, i) => <BusinessCardSkeleton key={i} />)}</div>
            : <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">{Array.from({ length: 10 }, (_, i) => <ProductCardSkeleton key={i} />)}</div>
        ) : count === 0 ? (
          <EmptyState
            icon={tab === 'businesses' ? SearchX : PackageSearch}
            title={open ? 'No hay negocios abiertos con esos filtros' : 'No encontramos resultados'}
            description="Probá con otra búsqueda o sacá algún filtro."
            action={hasFilters && <Button variant="outline" onClick={clear}>Limpiar filtros</Button>}
          />
        ) : tab === 'businesses' ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{businesses.data?.slice(0, visible).map((b) => <BusinessCard key={b.id} business={b} />)}</div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
            {products.data?.slice(0, visible).map((p) => p.business && <ProductCard key={p.id} product={p} business={p.business} showBusiness onOpen={() => setSelected(p)} />)}
          </div>
        )}
        {count > visible && <div className="mt-8 text-center"><Button variant="outline" onClick={() => setVisible((n) => n + PAGE_SIZE)}>Ver más</Button></div>}
      </div>

      <ProductDialog product={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
