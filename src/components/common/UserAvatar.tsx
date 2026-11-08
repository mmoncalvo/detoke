import { cn } from '@/lib/utils';

export const initials = (name = '') => name.split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]).join('').toUpperCase();

/** The user's picture, or their initials when there is none. */
export function UserAvatar({ name, src, className }: { name?: string; src?: string | null; className?: string }) {
  return src
    ? <img src={src} alt="" referrerPolicy="no-referrer" className={cn('aspect-square shrink-0 rounded-full object-cover', className)} />
    : <span aria-hidden className={cn('flex aspect-square shrink-0 items-center justify-center rounded-full bg-sidebar-accent text-xs font-semibold text-sidebar-accent-foreground', className)}>{initials(name)}</span>;
}
