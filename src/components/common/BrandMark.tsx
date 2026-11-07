import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

export function BrandMark({ className, inverted }: { className?: string; inverted?: boolean }) {
  return (
    <Link to="/" className={cn('inline-flex items-center gap-2 rounded-md font-display text-xl font-bold tracking-tight', className)} aria-label="Detoke, inicio">
      <img src="/favicon.svg" alt="" className="size-7" />
      <span className={inverted ? 'text-sidebar-accent-foreground' : 'text-primary'}>Detoke</span>
    </Link>
  );
}
