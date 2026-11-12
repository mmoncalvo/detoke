import { Link } from 'react-router-dom';
import { Wordmark } from '@/components/brand/LogoMarks';
import { cn } from '@/lib/utils';

/** The logo: the expression "detoke!" (the awning stays in the hero and footer). */
export function BrandMark({ className, inverted }: { className?: string; inverted?: boolean; compact?: boolean }) {
  return (
    <Link to="/" className={cn('inline-flex shrink-0 items-center rounded-md', className)} aria-label="Detoke, inicio">
      <Wordmark className={cn('text-[1.3rem] min-[360px]:text-[1.6rem]', inverted ? 'text-sidebar-accent-foreground' : 'text-primary')} />
    </Link>
  );
}
