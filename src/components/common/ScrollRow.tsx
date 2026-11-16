import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type ReactNode, type Ref } from 'react';
import { cn } from '@/lib/utils';

type Props = {
  children: ReactNode;
  /** Classes for the scrolling list (gap, padding, etc.). */
  className?: string;
  /** Classes for the outer wrapper (margins). */
  wrapperClassName?: string;
  /** Exposes the scrolling element, e.g. to scroll the active item into view. */
  scrollRef?: Ref<HTMLDivElement>;
  /** Renders the wrapper as a <nav> with this label. */
  navLabel?: string;
};

const EDGE_TOLERANCE = 4;

/**
 * Horizontal row that keeps native scrolling (touch, trackpad, wheel). When the items overflow, it adds
 * left/right arrows beside the list (not over it) and a short fade on the edge that hides more items.
 */
export function ScrollRow({ children, className, wrapperClassName, scrollRef, navLabel }: Props) {
  const inner = useRef<HTMLDivElement | null>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const setRefs = useCallback((node: HTMLDivElement | null) => {
    inner.current = node;
    if (typeof scrollRef === 'function') scrollRef(node);
    else if (scrollRef) (scrollRef as React.RefObject<HTMLDivElement | null>).current = node;
  }, [scrollRef]);

  const measure = useCallback(() => {
    const el = inner.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > EDGE_TOLERANCE);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - EDGE_TOLERANCE);
  }, []);

  useEffect(() => {
    const el = inner.current;
    if (!el) return;
    measure();
    el.addEventListener('scroll', measure, { passive: true });
    // Size changes of the row and items added later (categories load async) both change the overflow.
    const resize = new ResizeObserver(measure);
    resize.observe(el);
    const mutation = new MutationObserver(measure);
    mutation.observe(el, { childList: true, subtree: true });
    return () => {
      el.removeEventListener('scroll', measure);
      resize.disconnect();
      mutation.disconnect();
    };
  }, [measure]);

  const scrollBy = (direction: 1 | -1) => {
    const el = inner.current;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth * 0.7, behavior: 'smooth' });
  };

  const Wrapper = navLabel ? 'nav' : 'div';
  const overflowing = canLeft || canRight;

  return (
    <Wrapper aria-label={navLabel} className={cn('flex items-center gap-1', wrapperClassName)}>
      {overflowing && <Arrow side="left" enabled={canLeft} onClick={() => scrollBy(-1)} />}
      <div className="relative min-w-0 flex-1">
        <div ref={setRefs} className={cn('flex overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden', className, overflowing && 'px-1')}>
          {children}
        </div>
        <Fade side="left" visible={canLeft} />
        <Fade side="right" visible={canRight} />
      </div>
      {overflowing && <Arrow side="right" enabled={canRight} onClick={() => scrollBy(1)} />}
    </Wrapper>
  );
}

/** Short fade on the edge of the list, hinting that more items continue past it. */
function Fade({ side, visible }: { side: 'left' | 'right'; visible: boolean }) {
  return (
    <div
      aria-hidden
      className={cn(
        'pointer-events-none absolute inset-y-0 w-6 from-background to-transparent transition-opacity duration-200',
        side === 'left' ? 'left-0 bg-gradient-to-r' : 'right-0 bg-gradient-to-l',
        visible ? 'opacity-100' : 'opacity-0',
      )}
    />
  );
}

/** Arrow placed beside the list (not over it), shown while the row overflows and disabled at the end. */
function Arrow({ side, enabled, onClick }: { side: 'left' | 'right'; enabled: boolean; onClick: () => void }) {
  const Icon = side === 'left' ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!enabled}
      aria-label={side === 'left' ? 'Ver anteriores' : 'Ver más'}
      className="flex size-8 shrink-0 items-center justify-center rounded-full border bg-card text-muted-foreground shadow-sm transition-colors hover:border-primary/50 hover:text-foreground disabled:pointer-events-none disabled:opacity-60"
    >
      <Icon className="size-4" />
    </button>
  );
}
