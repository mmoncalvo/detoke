import { cn } from '@/lib/utils';

/** The striped, scalloped shop awning: the brand's signature edge. Same everywhere, in both themes. */
export function Awning({ className }: { className?: string }) {
  return <div className={cn('awning', className)} aria-hidden />;
}
