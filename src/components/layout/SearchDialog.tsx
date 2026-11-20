import { Search, Store, Tag } from 'lucide-react';
import { useEffect, useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import type { SearchResult } from '@shared/types';
import { api } from '@/api';
import { SafeImage } from '@/components/common/SafeImage';
import { Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { categoryIcon } from '@/lib/category-icons';
import { formatPrice } from '@/lib/format';
import { NO_AUTOFILL } from '@/components/ui/input';

// Height of the visible area, which shrinks when the phone keyboard opens (100dvh doesn't on most mobile browsers).
function useVisibleHeight(active: boolean) {
  const [height, setHeight] = useState<number | null>(null);
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!active || !viewport) return;
    const update = () => setHeight(viewport.height);
    update();
    viewport.addEventListener('resize', update);
    return () => viewport.removeEventListener('resize', update);
  }, [active]);
  return height;
}

const GROUPS = [
  { type: 'category', heading: 'Rubros' },
  { type: 'business', heading: 'Negocios' },
  { type: 'product', heading: 'Productos' },
] as const;

export function SearchDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const visibleHeight = useVisibleHeight(open);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onOpenChange]);

  useEffect(() => {
    if (!query.trim()) return setResults([]);
    const timer = setTimeout(() => {
      api<SearchResult[]>(`/search?q=${encodeURIComponent(query)}`).then(setResults).catch(() => setResults([]));
    }, 180);
    return () => clearTimeout(timer);
  }, [query]);

  const go = (result: SearchResult) => {
    onOpenChange(false);
    setQuery('');
    navigate(result.type === 'category' ? `/explorar?category=${result.slug}` : `/negocio/${result.slug}`);
  };

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Buscar"
      description="Buscá negocios, productos o rubros"
      // On small screens, pin the dialog to the top so the on-screen keyboard doesn't cover the results.
      className="top-10 max-w-[calc(100%-1rem)] translate-y-0 sm:max-w-2xl md:top-[50%] md:max-w-3xl md:translate-y-[-50%]"
    >
      <Command shouldFilter={false}>
        <CommandInput className="text-base md:text-sm" placeholder="Buscá pizza, panadería, un negocio..." value={query} onValueChange={setQuery} name="detoke-search-query" {...NO_AUTOFILL} />
        <CommandList
          // Fill the space above the keyboard on small screens: top gap + input row + bottom gap ≈ 6.5rem.
          style={{ '--visible-height': visibleHeight ? `${visibleHeight}px` : '100dvh' } as CSSProperties}
          className="max-h-[calc(var(--visible-height)-6.5rem)] md:max-h-[min(70vh,600px)]"
        >
          {query.trim() ? <CommandEmpty>No encontramos resultados para “{query}”.</CommandEmpty> : (
            <div className="flex flex-col items-center gap-2 px-6 py-10 text-center text-sm text-muted-foreground">
              <Search className="size-5" />
              Empezá a escribir para buscar en todo el barrio.
            </div>
          )}
          {GROUPS.map(({ type, heading }) => {
            const items = results.filter((r) => r.type === type);
            if (items.length === 0) return null;
            return (
              <CommandGroup key={type} heading={heading}>
                {items.map((result) => {
                  const Icon = result.type === 'category' ? categoryIcon(result.icon) : result.type === 'business' ? Store : Tag;
                  return (
                    <CommandItem key={`${result.type}-${result.id}`} value={`${result.type}-${result.id}`} onSelect={() => go(result)}>
                      {result.type !== 'category' && result.image ? (
                        <SafeImage src={result.image} alt="" className="size-9 shrink-0 rounded-md" />
                      ) : (
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-secondary"><Icon className="size-4" /></span>
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{result.title}</span>
                        <span className="block truncate text-xs text-muted-foreground">{result.subtitle}</span>
                      </span>
                      {result.type === 'product' && <span className="text-sm font-semibold">{formatPrice(result.price)}</span>}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            );
          })}
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
