import { BadgeCheck } from 'lucide-react';
import { useState } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

/**
 * The verified tick next to a business name. Hover shows the tooltip on desktop; a click or tap toggles it
 * (Radix tooltips close on click and never open on touch). It may sit inside a card link, so the click never navigates.
 */
export function VerifiedBadge({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const toggle = (event: React.SyntheticEvent) => {
    // preventDefault also skips Radix's close-on-click handler.
    event.preventDefault();
    event.stopPropagation();
    setOpen((current) => !current);
  };

  return (
    <Tooltip open={open} onOpenChange={setOpen}>
      <TooltipTrigger asChild>
        <span
          role="button"
          tabIndex={0}
          aria-label="Negocio verificado"
          className={cn('inline-flex shrink-0 cursor-pointer rounded-full text-primary outline-none focus-visible:ring-2 focus-visible:ring-ring/50', className)}
          onClick={toggle}
          onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') toggle(event); }}
        >
          <BadgeCheck className="size-full" />
        </span>
      </TooltipTrigger>
      <TooltipContent sideOffset={4}>Negocio verificado</TooltipContent>
    </Tooltip>
  );
}
