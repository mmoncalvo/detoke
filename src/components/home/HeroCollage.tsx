import { useEffect, useRef } from 'react';
import { SafeImage } from '@/components/common/SafeImage';
import { cn } from '@/lib/utils';

interface Photo {
  src: string;
  /** Where it lies on the table (position and size), and its own angle. */
  place: string;
  angle: number;
  /** How much it follows the pointer: the ones in front move more. */
  depth: number;
  priority?: boolean;
}

const PHOTOS: Photo[] = [
  { src: 'panaderia_cover.jpg', place: 'left-2 top-2 h-44 w-52', angle: -7, depth: 0.5 },
  { src: 'verduleria_cover.jpg', place: 'right-0 top-10 h-48 w-56', angle: 5, depth: 0.6 },
  { src: 'carniceria_cover.jpg', place: 'bottom-0 left-0 h-40 w-48', angle: 4, depth: 0.7 },
  { src: 'pizza_napolitana.jpg', place: 'bottom-6 left-[34%] z-10 h-60 w-60', angle: -3, depth: 1, priority: true },
];

/**
 * Photos dropped on a table, beside the hero text. With a mouse, they tilt and drift a little toward the
 * pointer (each layer by its own amount) and the one under it lifts; leaving, they settle back. The pointer
 * position goes to two CSS variables in an animation frame, so React does not re-render while it moves.
 * Off on touch screens and with reduced motion.
 */
export function HeroCollage({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const box = ref.current;
    if (!box || matchMedia('(pointer: coarse), (prefers-reduced-motion: reduce)').matches) return;
    let frame = 0;
    const set = (x: number, y: number) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        box.style.setProperty('--px', x.toFixed(3));
        box.style.setProperty('--py', y.toFixed(3));
      });
    };
    const move = (e: PointerEvent) => {
      const r = box.getBoundingClientRect();
      set(((e.clientX - r.left) / r.width) * 2 - 1, ((e.clientY - r.top) / r.height) * 2 - 1);
    };
    const leave = () => set(0, 0);
    box.addEventListener('pointermove', move);
    box.addEventListener('pointerleave', leave);
    return () => {
      cancelAnimationFrame(frame);
      box.removeEventListener('pointermove', move);
      box.removeEventListener('pointerleave', leave);
    };
  }, []);

  return (
    <div ref={ref} className={cn('relative [--px:0] [--py:0] [perspective:1000px]', className)} aria-hidden>
      {PHOTOS.map((photo) => (
        <div
          key={photo.src}
          className={cn('group absolute transition-transform duration-500 ease-out hover:z-20 motion-reduce:transition-none', photo.place)}
          style={{
            transform: `translate3d(calc(var(--px) * ${10 * photo.depth}px), calc(var(--py) * ${8 * photo.depth}px), 0) rotateX(calc(var(--py) * ${-5 * photo.depth}deg)) rotateY(calc(var(--px) * ${6 * photo.depth}deg)) rotate(${photo.angle}deg)`,
          }}
        >
          <SafeImage
            src={photo.src}
            alt=""
            loading="eager"
            fetchPriority={photo.priority ? 'high' : undefined}
            className="h-full w-full rounded-2xl border-[5px] border-[#FBF7EE] object-cover shadow-[0_18px_40px_-12px_rgb(0_0_0/0.55)] transition-[transform,box-shadow] duration-300 ease-out group-hover:scale-[1.04] group-hover:shadow-[0_28px_50px_-14px_rgb(0_0_0/0.65)]"
          />
        </div>
      ))}
    </div>
  );
}
