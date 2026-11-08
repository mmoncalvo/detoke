import { MoreHorizontal, Package, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { fold } from '@shared/business';
import type { Product, ProductCategory } from '@shared/types';
import { api } from '@/api';
import { SafeImage } from '@/components/common/SafeImage';
import { EmptyState, ErrorState } from '@/components/common/States';
import { ProductFormSheet } from '@/components/dashboard/ProductFormSheet';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useFetch } from '@/hooks/useFetch';
import { useTitle } from '@/hooks/useTitle';
import { useUrlState } from '@/hooks/useUrlState';
import { formatPrice } from '@/lib/format';

const ALL = 'all';

export default function Products() {
  useTitle('Productos');
  const { data: products, setData, error, loading, reload } = useFetch<Product[]>('/products/mine');
  const categories = useFetch<ProductCategory[]>('/product-categories');
  const [search, setSearch] = useUrlState('q', '');
  const [category, setCategory] = useUrlState('category', ALL);
  const [availability, setAvailability] = useUrlState('availability', ALL);
  const [editing, setEditing] = useState<Product | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<Product | null>(null);

  const visible = useMemo(() => {
    const term = fold(search.trim());
    return (products ?? []).filter((p) =>
      (!term || fold(p.name).includes(term)) &&
      (category === ALL || p.productCategoryId === category) &&
      (availability === ALL || p.isAvailable === (availability === 'available')));
  }, [products, search, category, availability]);

  const replace = (saved: Product) => setData((current) => {
    const list = current ?? [];
    return list.some((p) => p.id === saved.id) ? list.map((p) => (p.id === saved.id ? saved : p)) : [saved, ...list];
  });

  const toggle = async (product: Product, field: 'isAvailable' | 'featured', value: boolean) => {
    replace({ ...product, [field]: value });
    try {
      replace(await api<Product>(`/products/${product.id}`, { method: 'PUT', body: { [field]: value } }));
    } catch (err) {
      replace(product);
      toast.error((err as Error).message);
    }
  };

  const remove = async () => {
    if (!deleting) return;
    try {
      await api(`/products/${deleting.id}`, { method: 'DELETE' });
      setData((current) => (current ?? []).filter((p) => p.id !== deleting.id));
      toast.success('Producto eliminado');
    } catch (err) {
      toast.error((err as Error).message);
    }
    setDeleting(null);
  };

  const openForm = (product: Product | null) => {
    setEditing(product);
    setFormOpen(true);
  };

  if (error) return <ErrorState message={error} onRetry={reload} />;

  return (
    <div className="space-y-4">
      {/* The filters wrap instead of pushing the page sideways when the panel is narrow. */}
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <div className="relative min-w-48 flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input noAutofill value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar producto" className="bg-card pl-9" aria-label="Buscar producto" />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-full bg-card sm:w-48" aria-label="Filtrar por categoría"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todas las categorías</SelectItem>
            {(categories.data ?? []).map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={availability} onValueChange={setAvailability}>
          <SelectTrigger className="w-full bg-card sm:w-40" aria-label="Filtrar por disponibilidad"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos</SelectItem>
            <SelectItem value="available">Disponibles</SelectItem>
            <SelectItem value="hidden">No disponibles</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={() => openForm(null)}><Plus /> Nuevo producto</Button>
      </div>

      {loading && !products ? <Skeleton className="h-96 w-full rounded-xl" /> : (products ?? []).length === 0 ? (
        <EmptyState icon={Package} title="Todavía no cargaste productos" description="Sumá tu primer producto para que los clientes puedan pedirlo." action={<Button onClick={() => openForm(null)}><Plus /> Nuevo producto</Button>} />
      ) : visible.length === 0 ? (
        <EmptyState icon={Search} title="No hay productos con esos filtros" />
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Producto</TableHead>
                <TableHead className="hidden md:table-cell">Categoría</TableHead>
                <TableHead className="text-right">Precio</TableHead>
                <TableHead className="text-center">Disponible</TableHead>
                <TableHead className="hidden text-center sm:table-cell">Destacado</TableHead>
                <TableHead><span className="sr-only">Acciones</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    <button onClick={() => openForm(product)} className="flex min-w-0 items-center gap-3 text-left">
                      <SafeImage src={product.images[0]} alt="" className="size-10 shrink-0 rounded-md" />
                      <span className="max-w-24 truncate font-medium hover:underline sm:max-w-64">{product.name}</span>
                    </button>
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">{product.category?.name ?? 'Sin categoría'}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatPrice(product.price)}</TableCell>
                  <TableCell className="text-center"><Switch checked={product.isAvailable} onCheckedChange={(v) => toggle(product, 'isAvailable', v)} aria-label={`${product.name} disponible`} /></TableCell>
                  <TableCell className="hidden text-center sm:table-cell"><Switch checked={product.featured} onCheckedChange={(v) => toggle(product, 'featured', v)} aria-label={`${product.name} destacado`} /></TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="size-8" aria-label={`Acciones de ${product.name}`}><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openForm(product)}><Pencil /> Editar</DropdownMenuItem>
                        <DropdownMenuItem variant="destructive" onClick={() => setDeleting(product)}><Trash2 /> Eliminar</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <ProductFormSheet open={formOpen} product={editing} categories={categories.data ?? []} onClose={() => setFormOpen(false)} onSaved={(saved) => { replace(saved); setFormOpen(false); }} />

      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar “{deleting?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>Esta acción no se puede deshacer. Si solo querés ocultarlo un tiempo, desactivá “Disponible”.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={remove} className="bg-destructive text-white hover:bg-destructive/90">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
