import { Images, ImagePlus, Loader2, Trash2 } from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import type { Business } from '@shared/types';
import { api } from '@/api';
import { SafeImage } from '@/components/common/SafeImage';
import { EmptyState } from '@/components/common/States';
import { imageError } from '@/components/dashboard/ImageUpload';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { useTitle } from '@/hooks/useTitle';

const MAX_IMAGES = 12;

export default function Gallery() {
  useTitle('Galería');
  const { business, setBusiness } = useAuth();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  if (!business) return null;

  const upload = async (files: FileList | null) => {
    const list = Array.from(files ?? []);
    const invalid = list.map(imageError).find(Boolean);
    if (invalid) return void toast.error(invalid);
    if (list.length === 0) return;
    setBusy(true);
    try {
      const body = new FormData();
      list.forEach((file) => body.append('images', file));
      setBusiness(await api<Business>('/businesses/me/gallery', { method: 'POST', body }));
      toast.success('Fotos agregadas');
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };

  const remove = async (image: string) => {
    try {
      setBusiness(await api<Business>('/businesses/me/gallery', { method: 'DELETE', body: { image } }));
      toast.success('Foto eliminada');
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const addButton = (
    <Button onClick={() => input.current?.click()} disabled={busy || business.gallery.length >= MAX_IMAGES}>
      {busy ? <Loader2 className="animate-spin" /> : <ImagePlus />} Agregar fotos
    </Button>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted-foreground">Mostrá tu local, tu equipo y tus productos. {business.gallery.length} de {MAX_IMAGES} fotos.</p>
        {business.gallery.length > 0 && addButton}
      </div>
      {business.gallery.length === 0 ? (
        <EmptyState icon={Images} title="Tu galería está vacía" description="Las fotos del local generan confianza." action={addButton} />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {business.gallery.map((image) => (
            <div key={image} className="relative overflow-hidden rounded-xl border">
              <SafeImage src={image} alt="" className="aspect-square w-full" />
              <Button variant="secondary" size="icon" className="absolute right-2 top-2 size-8 shadow" aria-label="Eliminar foto" onClick={() => remove(image)}><Trash2 className="size-4" /></Button>
            </div>
          ))}
        </div>
      )}
      <input ref={input} type="file" multiple accept="image/jpeg,image/png,image/webp" className="sr-only" tabIndex={-1} onChange={(e) => upload(e.target.files)} />
    </div>
  );
}
