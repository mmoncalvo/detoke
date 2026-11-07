import { Minus, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function QuantityStepper({ quantity, name, onChange }: { quantity: number; name: string; onChange: (quantity: number) => void }) {
  return (
    <div className="inline-flex items-center rounded-lg border bg-card">
      <Button variant="ghost" size="icon" className="size-9" aria-label={quantity === 1 ? `Quitar ${name}` : `Restar uno de ${name}`} onClick={() => onChange(quantity - 1)}>
        {quantity === 1 ? <Trash2 className="size-4" /> : <Minus className="size-4" />}
      </Button>
      <span className="w-7 text-center text-sm font-semibold tabular-nums" aria-live="polite">{quantity}</span>
      <Button variant="ghost" size="icon" className="size-9" aria-label={`Sumar uno de ${name}`} onClick={() => onChange(quantity + 1)}>
        <Plus className="size-4" />
      </Button>
    </div>
  );
}
