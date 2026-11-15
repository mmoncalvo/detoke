import { Minus, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import type { BusinessSummary, Product } from '@shared/types';
import { SafeImage } from '@/components/common/SafeImage';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { useCart } from '@/context/CartContext';
import { formatPrice } from '@/lib/format';
import { ProductPrice } from './ProductCard';

export function ProductDialog({ product, business, onClose }: { product: Product | null; business?: BusinessSummary; onClose: () => void }) {
  const { add } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [image, setImage] = useState(0);

  useEffect(() => {
    setQuantity(1);
    setImage(0);
  }, [product?.id]);

  const owner = business ?? product?.business;

  return (
    <Dialog open={!!product} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[92svh] max-w-[calc(100%-1.5rem)] gap-0 overflow-y-auto p-0 sm:max-w-4xl lg:max-w-5xl">
        {product && owner && (
          <div className="grid sm:grid-cols-2">
            {/* The photo covers its whole column (square on phones, as tall as the details beside it on
                larger screens), with the other photos' thumbnails over its bottom edge. */}
            <div className="relative aspect-square sm:aspect-auto">
              <SafeImage src={product.images[image]} alt={product.name} className="absolute inset-0 size-full" />
              {product.images.length > 1 && (
                <div className="absolute inset-x-0 bottom-0 flex gap-2 bg-gradient-to-t from-black/40 to-transparent p-3 pt-8">
                  {product.images.map((src, i) => (
                    <button key={src} onClick={() => setImage(i)} aria-label={`Ver imagen ${i + 1}`} className={`cursor-pointer overflow-hidden rounded-md border-2 shadow-sm ${i === image ? 'border-white' : 'border-white/30'}`}>
                      <SafeImage src={src} alt="" className="size-12" />
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex flex-col p-6 sm:min-h-[26rem] lg:min-h-[32rem] lg:p-8">
              {product.category && <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{product.category.name}</p>}
              <DialogTitle className="mt-1 font-display text-2xl leading-tight lg:text-3xl">{product.name}</DialogTitle>
              <DialogDescription className="mt-2 text-sm leading-relaxed lg:text-base">{product.description || `De ${owner.name}.`}</DialogDescription>
              <ProductPrice product={product} className="mt-4 text-2xl" />
              {product.stock != null && product.stock <= 10 && <p className="mt-1 text-sm font-medium text-warning-foreground">Quedan {product.stock}</p>}

              <div className="mt-auto flex items-center gap-3 pt-6">
                <div className="inline-flex items-center rounded-lg border">
                  <Button variant="ghost" size="icon" aria-label="Restar uno" disabled={quantity <= 1} onClick={() => setQuantity(quantity - 1)}><Minus className="size-4" /></Button>
                  <span className="w-8 text-center font-semibold tabular-nums">{quantity}</span>
                  <Button variant="ghost" size="icon" aria-label="Sumar uno" onClick={() => setQuantity(quantity + 1)}><Plus className="size-4" /></Button>
                </div>
                <Button
                  className="flex-1"
                  onClick={() => {
                    add(product, owner, quantity);
                    toast.success('Agregado a tu pedido', { description: product.name, duration: 1600 });
                    onClose();
                  }}
                >
                  Agregar · {formatPrice(product.price * quantity)}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
