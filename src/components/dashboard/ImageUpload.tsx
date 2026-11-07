import { ImagePlus, Loader2 } from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { imageUrl } from '@/lib/images';
import { cn } from '@/lib/utils';

const MAX_BYTES = 8 * 1024 * 1024;

/** Returns the error to show for a file, or null if it can be uploaded. */
export function imageError(file: File) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return 'Solo se aceptan imágenes JPG, PNG o WEBP';
  if (file.size > MAX_BYTES) return 'La imagen supera los 8 MB';
  return null;
}

export function ImageUpload({ value, label, hint, className, onUpload }: { value?: string | null; label: string; hint?: string; className?: string; onUpload: (file: File) => Promise<unknown> }) {
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const src = preview ?? imageUrl(value);

  const pick = async (file?: File) => {
    if (!file) return;
    const error = imageError(file);
    if (error) return void toast.error(error);
    const url = URL.createObjectURL(file);
    setPreview(url);
    setBusy(true);
    try {
      await onUpload(file);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setPreview(null);
      URL.revokeObjectURL(url);
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };

  return (
    <div>
      <p className="mb-1.5 text-sm font-medium">{label}</p>
      <button
        type="button"
        onClick={() => input.current?.click()}
        aria-label={value ? `Cambiar ${label.toLowerCase()}` : `Subir ${label.toLowerCase()}`}
        className={cn('group relative flex items-center justify-center overflow-hidden rounded-xl border-2 border-dashed bg-secondary/50 text-muted-foreground transition-colors hover:border-primary', className)}
      >
        {src && <img src={src} alt="" className="absolute inset-0 size-full object-cover" />}
        <span className={cn('relative flex flex-col items-center gap-1 rounded-lg p-2 text-xs font-medium', src && 'bg-black/55 text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100')}>
          {busy ? <Loader2 className="size-5 animate-spin" /> : <ImagePlus className="size-5" />}
          {busy ? 'Subiendo' : src ? 'Cambiar' : 'Elegir imagen'}
        </span>
      </button>
      {hint && <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>}
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" tabIndex={-1} onChange={(e) => pick(e.target.files?.[0])} />
    </div>
  );
}
