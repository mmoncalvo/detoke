import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import type { BusinessSummary, Product } from '@shared/types';
import { QuantityStepper } from '@/components/common/QuantityStepper';
import { SafeImage } from '@/components/common/SafeImage';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useCart } from '@/context/CartContext';
import { formatPrice } from '@/lib/format';

export function ProductPrice({ product, className }: { product: Product; className?: string }) {
  return (
    <p className={className}>
      <span className="font-semibold">{formatPrice(product.price)}</span>
      {product.compareAtPrice != null && product.compareAtPrice > product.price && (
        <s className="ml-1.5 text-sm font-normal text-muted-foreground">{formatPrice(product.compareAtPrice)}</s>
      )}
    </p>
  );
}

export function ProductCard({ product, business, showBusiness, onOpen }: { product: Product; business: BusinessSummary; showBusiness?: boolean; onOpen: () => void }) {
  const { add, quantityOf, setQuantity } = useCart();
  const quantity = quantityOf(product.id);
  const onSale = product.compareAtPrice != null && product.compareAtPrice > product.price;

  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border bg-card">
      <button onClick={onOpen} className="relative block text-left" aria-label={`Ver ${product.name}`}>
        <SafeImage src={product.images[0]} alt="" className="aspect-square w-full" />
        {onSale && <Badge className="absolute left-2 top-2 border-transparent bg-tomato text-white">Oferta</Badge>}
      </button>
      <div className="flex flex-1 flex-col p-3">
        <button onClick={onOpen} className="text-left">
          <h3 className="line-clamp-2 font-sans text-sm font-semibold leading-snug">{product.name}</h3>
        </button>
        {showBusiness && <Link to={`/negocio/${business.slug}`} className="mt-0.5 truncate text-xs text-muted-foreground hover:underline">{business.name}</Link>}
        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
          <ProductPrice product={product} className="min-w-0 truncate text-[15px]" />
          {quantity === 0 && (
            <Button
              size="icon"
              className="size-9 shrink-0"
              aria-label={`Agregar ${product.name}`}
              onClick={() => { add(product, business); toast.success('Agregado a tu pedido', { description: product.name, duration: 1600 }); }}
            >
              <Plus className="size-5" />
            </Button>
          )}
        </div>
        {quantity > 0 && <div className="mt-2"><QuantityStepper quantity={quantity} name={product.name} onChange={(q) => setQuantity(product.id, q)} /></div>}
      </div>
    </article>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border bg-card">
      <Skeleton className="aspect-square w-full rounded-none" />
      <div className="space-y-2 p-3">
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    </div>
  );
}
