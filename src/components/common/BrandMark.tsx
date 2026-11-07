import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

export function BrandMark({ className, inverted, compact }: { className?: string; inverted?: boolean; compact?: boolean }) {
  return (
    <Link to="/" className={cn('inline-flex shrink-0 items-center gap-2 rounded-md font-display text-xl font-bold tracking-tight', className)} aria-label="Detoke, inicio">
      <img src="/favicon.svg" alt="" className="size-7" />
      <span className={cn(inverted ? 'text-sidebar-accent-foreground' : 'text-primary', compact && 'hidden min-[360px]:inline')}>Detoke</span>
    </Link>
  );
}
