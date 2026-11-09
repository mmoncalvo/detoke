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
  { src: 'panaderia_cover.jpg', place: 'left-6 top-4 h-44 w-52', angle: -7, depth: 0.5 },
  { src: 'verduleria_cover.jpg', place: 'right-4 top-12 h-48 w-56', angle: 5, depth: 0.6 },
  { src: 'carniceria_cover.jpg', place: 'bottom-10 left-4 h-40 w-48', angle: 4, depth: 0.7 },
  { src: 'pizza_napolitana.jpg', place: 'bottom-3 left-[calc(34%-11px)] z-10 h-[262px] w-[262px]', angle: -3, depth: 1, priority: true },
];

/**
 * Photos dropped on a table, beside the hero text. With a mouse, they tilt and drift a little toward the
 * pointer (each layer by its own amount) and the one under it lifts a little, keeping its place in the stack; leaving, they settle back. The pointer
 * position goes to two CSS variables in an animation frame, so React does not re-render while it moves.
 * Off on touch screens and with reduced motion.
 */
export function HeroCollage({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const box = ref.current;
    if (!box || matchMedia('(pointer: coarse), (prefers-reduced-motion: reduce)').matches) return;
    // The photos chase the pointer with a little inertia: each frame closes part of the gap, so the
    // movement eases in and out on its own and never restarts mid-way.
    const target = { x: 0, y: 0 };
    const current = { x: 0, y: 0 };
    let frame = 0;
    const tick = () => {
      current.x += (target.x - current.x) * 0.09;
      current.y += (target.y - current.y) * 0.09;
      box.style.setProperty('--px', current.x.toFixed(4));
      box.style.setProperty('--py', current.y.toFixed(4));
      const settled = Math.abs(target.x - current.x) < 0.001 && Math.abs(target.y - current.y) < 0.001;
      frame = settled ? 0 : requestAnimationFrame(tick);
    };
    const aim = (x: number, y: number) => {
      target.x = x;
      target.y = y;
      if (!frame) frame = requestAnimationFrame(tick);
    };
    const move = (e: PointerEvent) => {
      const r = box.getBoundingClientRect();
      aim(((e.clientX - r.left) / r.width) * 2 - 1, ((e.clientY - r.top) / r.height) * 2 - 1);
    };
    const leave = () => aim(0, 0);
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
      {PHOTOS.map((photo, i) => (
        <div
          key={photo.src}
          className={cn('group absolute', photo.place)}
          style={{
            transform: `translate3d(calc(var(--px) * ${14 * photo.depth}px), calc(var(--py) * ${10 * photo.depth}px), 0) rotateX(calc(var(--py) * ${-7 * photo.depth}deg)) rotateY(calc(var(--px) * ${8 * photo.depth}deg)) rotate(${photo.angle}deg)`,
          }}
        >
          {/* Dropped on the table one after another, then floating gently, each at its own pace. */}
          <div className="hero-drop h-full w-full" style={{ animationDelay: `${120 + i * 110}ms` }}>
            <div className="hero-float relative h-full w-full" style={{ animationDuration: `${6 + i * 1.3}s`, animationDelay: `${-i * 1.7}s` }}>
              <SafeImage
                src={photo.src}
                alt=""
                loading="eager"
                fetchPriority={photo.priority ? 'high' : undefined}
                className="h-full w-full rounded-2xl border-[5px] border-[#FBF7EE] object-cover shadow-[0_18px_40px_-12px_rgb(0_0_0/0.55)] transition-[transform,box-shadow] duration-[1100ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:-translate-y-1 group-hover:scale-[1.08] group-hover:shadow-[0_32px_56px_-16px_rgb(0_0_0/0.7)]"
              />
              {/* A soft light that follows the pointer over the photo under it. */}
              <span
                className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 mix-blend-soft-light transition-[opacity,transform] duration-[1100ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:-translate-y-1 group-hover:scale-[1.08] group-hover:opacity-100"
                style={{ background: 'radial-gradient(circle at calc(50% + var(--px) * 45%) calc(50% + var(--py) * 45%), rgb(255 255 255 / 0.55), transparent 60%)' }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
