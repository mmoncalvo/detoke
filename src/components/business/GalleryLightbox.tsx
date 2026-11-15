import { useEffect, useState } from 'react';
import { Carousel, type CarouselApi, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { imageUrl } from '@/lib/images';

/**
 * The business gallery, one photo at a time, opened at the photo that was clicked. With more than one
 * photo it is a carousel (shadcn's, on Embla): arrows on the sides, the keyboard arrows, a swipe on
 * touch screens, and it wraps around at both ends. Each photo covers the whole modal, edge to edge.
 */
export function GalleryLightbox({ photos, start, onClose, title }: { photos: string[]; start: number | null; onClose: () => void; title: string }) {
  const many = photos.length > 1;
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!api) return;
    const update = () => setCurrent(api.selectedScrollSnap());
    update();
    api.on('select', update);
    return () => void api.off('select', update);
  }, [api]);

  // The keyboard arrows work as soon as the modal opens, wherever the focus is (the carousel alone
  // listens only while it has the focus; those presses arrive here already handled and are skipped).
  useEffect(() => {
    if (!api || !many || start === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;
      if (e.key === 'ArrowLeft') { e.preventDefault(); api.scrollPrev(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); api.scrollNext(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [api, many, start]);

  const arrow = 'size-10 cursor-pointer border-0 bg-black/45 text-white backdrop-blur-sm hover:bg-black/65 hover:text-white dark:bg-black/45 dark:hover:bg-black/65';

  return (
    <Dialog open={start !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-3xl">
        <DialogTitle className="sr-only">Fotos de {title}</DialogTitle>
        <DialogDescription className="sr-only">{many ? `Foto ${current + 1} de ${photos.length}. Usá las flechas para pasar de una a otra.` : 'Foto ampliada de la galería'}</DialogDescription>
        {start !== null && (
          <Carousel setApi={setApi} opts={{ startIndex: start, loop: true, duration: 22 }} className="relative">
            <CarouselContent className="ml-0">
              {photos.map((src) => (
                <CarouselItem key={src} className="pl-0">
                  <img src={imageUrl(src)} alt="" className="block aspect-square max-h-[85svh] w-full object-cover sm:aspect-[4/3]" />
                </CarouselItem>
              ))}
            </CarouselContent>
            {many && (
              <>
                <CarouselPrevious className={`left-3 ${arrow}`} aria-label="Foto anterior" />
                <CarouselNext className={`right-3 ${arrow}`} aria-label="Foto siguiente" />
                <span className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/45 px-2.5 py-0.5 text-xs font-medium text-white tabular-nums backdrop-blur-sm" aria-hidden>
                  {current + 1} / {photos.length}
                </span>
              </>
            )}
          </Carousel>
        )}
      </DialogContent>
    </Dialog>
  );
}
