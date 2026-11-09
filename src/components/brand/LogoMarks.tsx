// The brand's isotype, in three explored versions. All are drawn on a 32×32 grid with few shapes so
// they still read at 16 px. Brand colors are fixed (a logo looks the same in both themes); `mono`
// draws everything with currentColor, for one-color uses.
import { cn } from '@/lib/utils';
import { WORDMARKS, type WordmarkName } from './wordmarks';

export const BRAND = { green: '#1D5C45', cream: '#FBF7EE', mustard: '#E3A82B' };

type MarkProps = { className?: string; mono?: boolean; title?: string };

function Svg({ className, title, children }: { className?: string; title?: string; children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 32 32" className={cn('shrink-0', className)} role={title ? 'img' : undefined} aria-hidden={title ? undefined : true} xmlns="http://www.w3.org/2000/svg">
      {title && <title>{title}</title>}
      {children}
    </svg>
  );
}

/**
 * Four even stripes (x 6–26) hanging from the valance, each ending in a half-circle scallop of its
 * width: a friendly, rounded awning that matches the rounded lettering.
 */
const STRIPES = [0, 1, 2, 3].map((i) => {
  const x0 = 6 + i * 5;
  const x1 = x0 + 5;
  return `M${x0} 12H${x1}V19.25A2.5 2.5 0 0 1 ${x0} 19.25Z`;
});

/** A: the shop awning, alone and centered on the green tile: the brand's signature, readable from 16 px. */
export function MarkAwning({ className, mono, title }: MarkProps) {
  const bg = mono ? 'currentColor' : BRAND.green;
  const a = mono ? 'var(--background, #fff)' : BRAND.cream;
  const b = mono ? 'var(--background, #fff)' : BRAND.mustard;
  return (
    <Svg className={className} title={title}>
      <rect width="32" height="32" rx="9" fill={bg} />
      {STRIPES.map((d, i) => <path key={d} d={d} fill={i % 2 ? b : a} opacity={mono && i % 2 ? 0.55 : 1} />)}
      <rect x="5" y="9.25" width="22" height="3.5" rx="1.75" fill={a} />
    </Svg>
  );
}

/** B: a lowercase "d" with the awning on top: the name's first letter as a shop. */
export function MarkLetter({ className, mono, title }: MarkProps) {
  const bg = mono ? 'currentColor' : BRAND.green;
  const fg = mono ? 'var(--background, #fff)' : BRAND.cream;
  const accent = mono ? 'var(--background, #fff)' : BRAND.mustard;
  return (
    <Svg className={className} title={title}>
      <rect width="32" height="32" rx="8" fill={bg} />
      {/* The awning hangs over the bowl; the stem rises past it, so the letter reads as a "d". */}
      <path d="M6 7.5H17V11A2.75 2.75 0 0 1 11.5 11A2.75 2.75 0 0 1 6 11Z" fill={accent} />
      <circle cx="13.6" cy="20.4" r="5.2" fill="none" stroke={fg} strokeWidth="3.2" />
      <rect x="19.2" y="5.5" width="3.2" height="21" rx="1.6" fill={fg} />
    </Svg>
  );
}

/** C: a map pin with the awning inside: the shop around the corner. */
export function MarkPin({ className, mono, title }: MarkProps) {
  const bg = mono ? 'currentColor' : BRAND.green;
  const a = mono ? 'var(--background, #fff)' : BRAND.cream;
  const b = mono ? 'var(--background, #fff)' : BRAND.mustard;
  const stripes = [0, 1, 2].map((i) => {
    const x0 = 9.5 + i * (13 / 3);
    const x1 = x0 + 13 / 3;
    return `M${x0.toFixed(2)} 9H${x1.toFixed(2)}V13.5A${(13 / 6).toFixed(2)} ${(13 / 6).toFixed(2)} 0 0 1 ${x0.toFixed(2)} 13.5Z`;
  });
  return (
    <Svg className={className} title={title}>
      <path d="M16 1.5C9.6 1.5 5 6.3 5 12.3C5 19.8 16 30.5 16 30.5S27 19.8 27 12.3C27 6.3 22.4 1.5 16 1.5Z" fill={bg} />
      {stripes.map((d, i) => <path key={d} d={d} fill={i % 2 ? b : a} opacity={mono && i % 2 ? 0.55 : 1} />)}
      <rect x="11.5" y="18" width="9" height="2.2" rx="1.1" fill={a} />
    </Svg>
  );
}

export const MARKS = { awning: MarkAwning, letter: MarkLetter, pin: MarkPin };
export type MarkName = keyof typeof MARKS;

/** The one in use across the app. */
export const LogoMark = MarkAwning;

/** The typeface in use for the lettering (see /dev/logo for the others). */
export const WORDMARK: WordmarkName = 'quicksand';

/**
 * "detoke" drawn from the font's outlines (no font to load), in currentColor; its height follows the
 * text size (1em), in one color (`accent` would paint the "o" mustard; off).
 */
export function Wordmark({ className, name = WORDMARK, accent = false }: { className?: string; name?: WordmarkName; accent?: boolean }) {
  const w = WORDMARKS[name];
  const [x, y, width, height] = w.viewBox;
  return (
    <svg viewBox={`${x} ${y} ${width} ${height}`} className={cn('h-[1.05em] w-auto shrink-0 overflow-visible text-[1.35rem]', className)} role="img" aria-label="detoke" xmlns="http://www.w3.org/2000/svg">
      {w.letters.map((l, i) => <path key={i} d={l.d} fill={accent && l.char === 'o' ? BRAND.mustard : 'currentColor'} />)}
    </svg>
  );
}
