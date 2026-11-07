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
      <DialogContent className="max-h-[90svh] gap-0 overflow-y-auto p-0 sm:max-w-3xl">
        {product && owner && (
          <div className="grid sm:grid-cols-2">
            <div>
              <SafeImage src={product.images[image]} alt={product.name} className="aspect-square w-full sm:rounded-l-lg" />
              {product.images.length > 1 && (
                <div className="flex gap-2 p-3">
                  {product.images.map((src, i) => (
                    <button key={src} onClick={() => setImage(i)} aria-label={`Ver imagen ${i + 1}`} className={`overflow-hidden rounded-md border-2 ${i === image ? 'border-primary' : 'border-transparent'}`}>
                      <SafeImage src={src} alt="" className="size-12" />
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex flex-col p-6">
              {product.category && <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{product.category.name}</p>}
              <DialogTitle className="mt-1 font-display text-2xl leading-tight">{product.name}</DialogTitle>
              <DialogDescription className="mt-2 text-sm leading-relaxed">{product.description || `De ${owner.name}.`}</DialogDescription>
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
