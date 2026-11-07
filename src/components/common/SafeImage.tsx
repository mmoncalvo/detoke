import { ImageOff } from 'lucide-react';
import { useState } from 'react';
import { imageUrl } from '@/lib/images';
import { cn } from '@/lib/utils';

/** Image with a neutral placeholder when it is missing or fails to load. */
export function SafeImage({ src, alt, className }: { src?: string | null; alt: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  const url = imageUrl(src);
  if (!url || failed) {
    return (
      <div className={cn('flex items-center justify-center bg-secondary text-muted-foreground/60', className)} role="img" aria-label={alt}>
        <ImageOff className="size-1/4 max-h-8 max-w-8" />
      </div>
    );
  }
  return <img src={url} alt={alt} loading="lazy" onError={() => setFailed(true)} className={cn('object-cover', className)} />;
}
