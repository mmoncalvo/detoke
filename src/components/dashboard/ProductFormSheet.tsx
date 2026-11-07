import { zodResolver } from '@hookform/resolvers/zod';
import { ImagePlus, Loader2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import type { z } from 'zod';
import { productSchema } from '@shared/schemas';
import type { Product, ProductCategory } from '@shared/types';
import { api } from '@/api';
import { SelectField, TextAreaField, TextField } from '@/components/common/FormFields';
import { SafeImage } from '@/components/common/SafeImage';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { imageError } from './ImageUpload';

type Input = z.input<typeof productSchema>;
type Output = z.output<typeof productSchema>;

const EMPTY = { name: '', description: '', price: '', compareAtPrice: '', images: [], stock: '', isAvailable: true, featured: false, productCategoryId: '' } as unknown as Input;

const toForm = (p: Product): Input => ({
  name: p.name,
  description: p.description ?? '',
  price: p.price,
  compareAtPrice: p.compareAtPrice ?? '',
  images: p.images,
  stock: p.stock ?? '',
  isAvailable: p.isAvailable,
  featured: p.featured,
  productCategoryId: p.productCategoryId ?? '',
});

export function ProductFormSheet({ open, product, categories, onClose, onSaved }: { open: boolean; product: Product | null; categories: ProductCategory[]; onClose: () => void; onSaved: (product: Product) => void }) {
  const form = useForm<Input, unknown, Output>({ resolver: zodResolver(productSchema), defaultValues: EMPTY });
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const images = form.watch('images') ?? [];

  useEffect(() => {
    if (open) form.reset(product ? toForm(product) : EMPTY);
  }, [open, product, form]);

  const addImages = async (files: FileList | null) => {
    setUploading(true);
    try {
      for (const file of Array.from(files ?? [])) {
        const error = imageError(file);
        if (error) throw new Error(error);
        const body = new FormData();
        body.append('image', file);
        const { path } = await api<{ path: string }>('/products/images', { method: 'POST', body });
        form.setValue('images', [...(form.getValues('images') ?? []), path], { shouldDirty: true });
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setUploading(false);
      if (input.current) input.current.value = '';
    }
  };

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const saved = await api<Product>(product ? `/products/${product.id}` : '/products', { method: product ? 'PUT' : 'POST', body: values });
      toast.success(product ? 'Producto actualizado' : 'Producto creado');
      onSaved(saved);
    } catch (err) {
      toast.error((err as Error).message);
    }
  });

  return (
    <Sheet open={open} onOpenChange={(value) => !value && onClose()}>
      <SheetContent className="flex w-full flex-col gap-0 sm:max-w-lg">
        <SheetHeader className="border-b">
          <SheetTitle className="font-display text-xl">{product ? 'Editar producto' : 'Nuevo producto'}</SheetTitle>
          <SheetDescription>Lo que cargues acá se ve en tu página pública.</SheetDescription>
        </SheetHeader>
        <Form {...form}>
          <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col" noValidate>
            <div className="flex-1 space-y-4 overflow-y-auto p-4">
              <div>
                <p className="mb-1.5 text-sm font-medium">Fotos</p>
                <div className="flex flex-wrap gap-2">
                  {images.map((src) => (
                    <div key={src} className="relative">
                      <SafeImage src={src} alt="" className="size-20 rounded-lg" />
                      <button type="button" aria-label="Quitar foto" onClick={() => form.setValue('images', images.filter((i) => i !== src), { shouldDirty: true })} className="absolute -right-1.5 -top-1.5 flex size-6 items-center justify-center rounded-full border bg-card shadow-sm"><X className="size-3.5" /></button>
                    </div>
                  ))}
                  {images.length < 6 && (
                    <button type="button" onClick={() => input.current?.click()} disabled={uploading} className="flex size-20 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed text-xs text-muted-foreground hover:border-primary">
                      {uploading ? <Loader2 className="size-5 animate-spin" /> : <ImagePlus className="size-5" />} Agregar
                    </button>
                  )}
                </div>
                <input ref={input} type="file" multiple accept="image/jpeg,image/png,image/webp" className="sr-only" tabIndex={-1} onChange={(e) => addImages(e.target.files)} />
              </div>

              <TextField control={form.control} name="name" label="Nombre" />
              <SelectField control={form.control} name="productCategoryId" label="Categoría" placeholder="Elegí una categoría" options={categories} />
              <TextAreaField control={form.control} name="description" label="Descripción" rows={3} />
              <div className="grid grid-cols-2 gap-3">
                <TextField control={form.control} name="price" label="Precio" type="number" inputMode="decimal" min={0} />
                <TextField control={form.control} name="compareAtPrice" label="Precio anterior" type="number" inputMode="decimal" min={0} description="Opcional, para mostrar oferta." />
              </div>
              <TextField control={form.control} name="stock" label="Stock" type="number" inputMode="numeric" min={0} description="Dejalo vacío si no querés controlarlo." />

              {([['isAvailable', 'Disponible', 'Se muestra en tu página.'], ['featured', 'Destacado', 'Aparece primero y en la portada.']] as const).map(([name, label, hint]) => (
                <FormField
                  key={name}
                  control={form.control}
                  name={name}
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-3">
                      <div><FormLabel>{label}</FormLabel><p className="text-sm text-muted-foreground">{hint}</p></div>
                      <FormControl><Switch checked={!!field.value} onCheckedChange={field.onChange} /></FormControl>
                    </FormItem>
                  )}
                />
              ))}
            </div>
            <div className="flex gap-2 border-t p-4">
              <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
              <Button type="submit" className="flex-1" disabled={form.formState.isSubmitting || uploading}>{form.formState.isSubmitting && <Loader2 className="animate-spin" />} Guardar</Button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
