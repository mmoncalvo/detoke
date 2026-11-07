import { useEffect, useRef } from 'react';
import { SafeImage } from '@/components/common/SafeImage';
import { cn } from '@/lib/utils';

/** Share of the scroll the image follows: lower moves it slower than the page. */
const SPEED = { pointer: 0.35, touch: 0.2 };
/** Fraction of the remaining distance covered per frame, for a smooth catch-up. */
const EASING = 0.14;
/** How dark the cover gets once it has scrolled out. */
const MAX_SHADE = 0.35;

/**
 * Cover image with a smoothed parallax: it scrolls slower than the page and
 * darkens a little. Static when the user prefers reduced motion.
 */
export function ParallaxCover({ src, className }: { src?: string | null; className?: string }) {
  const frame = useRef<HTMLDivElement>(null);
  const layer = useRef<HTMLDivElement>(null);
  const shade = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = frame.current;
    const image = layer.current;
    if (!container || !image || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const speed = window.matchMedia('(pointer: coarse)').matches ? SPEED.touch : SPEED.pointer;
    let current = 0;
    let raf = 0;
    let visible = false;

    const target = () => {
      const { top, height } = container.getBoundingClientRect();
      const scrolled = Math.min(Math.max(-top, 0), height);
      return { offset: scrolled * speed, progress: height ? scrolled / height : 0 };
    };

    const tick = () => {
      const { offset, progress } = target();
      current += (offset - current) * EASING;
      if (Math.abs(offset - current) < 0.1) current = offset;
      image.style.transform = `translate3d(0, ${current.toFixed(2)}px, 0) scale(${(1 + progress * 0.04).toFixed(4)})`;
      if (shade.current) shade.current.style.opacity = String(progress * MAX_SHADE);
      raf = visible && current !== offset ? requestAnimationFrame(tick) : 0;
    };
    const schedule = () => {
      if (visible && !raf) raf = requestAnimationFrame(tick);
    };

    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      schedule();
    });
    observer.observe(container);
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div ref={frame} className={cn('relative overflow-hidden', className)}>
      {/* Taller than the frame so its edges never show while it moves. */}
      <div ref={layer} className="absolute inset-x-0 -top-[15%] h-[130%] will-change-transform">
        <SafeImage src={src} alt="" className="size-full" />
      </div>
      <div ref={shade} className="pointer-events-none absolute inset-0 bg-black opacity-0" aria-hidden />
    </div>
  );
}
