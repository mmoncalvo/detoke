import { Link } from 'react-router-dom';
import { LogoMark, Wordmark } from '@/components/brand/LogoMarks';
import { cn } from '@/lib/utils';

export function BrandMark({ className, inverted, compact }: { className?: string; inverted?: boolean; compact?: boolean }) {
  return (
    <Link to="/" className={cn('inline-flex shrink-0 items-center gap-2 rounded-md', className)} aria-label="Detoke, inicio">
      <LogoMark className="size-8" />
      <Wordmark className={cn(inverted ? 'text-sidebar-accent-foreground' : 'text-primary', compact && 'hidden min-[360px]:inline')} />
    </Link>
  );
}
