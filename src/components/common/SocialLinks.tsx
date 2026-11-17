import type { SVGProps } from 'react';
import { cn } from '@/lib/utils';

// Official detoke profiles. Update here if the handles change.
export const SOCIAL_LINKS = {
  facebook: 'https://www.facebook.com/detoke.uy',
  instagram: 'https://www.instagram.com/detoke.uy/',
};

const ICON = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true } as const;

function FacebookIcon(props: SVGProps<SVGSVGElement>) {
  return <svg {...ICON} {...props}><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" /></svg>;
}

function InstagramIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...ICON} {...props}>
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

const ITEMS = [
  { href: SOCIAL_LINKS.facebook, label: 'Facebook', Icon: FacebookIcon },
  { href: SOCIAL_LINKS.instagram, label: 'Instagram', Icon: InstagramIcon },
];

/** Facebook and Instagram icons; they open in a new tab. */
export function SocialLinks({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-1', className)}>
      {ITEMS.map(({ href, label, Icon }) => (
        <a
          key={label}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`detoke en ${label} (se abre en una pestaña nueva)`}
          title={label}
          className="cursor-pointer rounded-md p-1.5 transition-colors duration-200 hover:text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        >
          <Icon className="size-5" />
        </a>
      ))}
    </div>
  );
}
