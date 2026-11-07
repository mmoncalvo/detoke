import { BadgeCheck, Bike, Store } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Business } from '@shared/types';
import { SafeImage } from '@/components/common/SafeImage';
import { Skeleton } from '@/components/ui/skeleton';
import { OpenBadge } from './OpenBadge';

export function BusinessCard({ business }: { business: Business }) {
  const delivers = business.deliveryOptions.includes('delivery');
  return (
    <Link to={`/negocio/${business.slug}`} className="group flex flex-col overflow-hidden rounded-2xl border bg-card transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/5">
      <div className="relative">
        <SafeImage src={business.coverImage} alt="" className="aspect-[16/9] w-full transition-transform duration-500 group-hover:scale-[1.03]" />
        <OpenBadge hours={business.hours} className="absolute right-2 top-2 bg-card/95 shadow-sm" />
      </div>
      <div className="relative flex flex-1 flex-col px-4 pb-4 pt-8">
        <SafeImage src={business.logo} alt={`Logo de ${business.name}`} className="absolute -top-7 left-4 size-14 rounded-xl border-2 border-card shadow-sm" />
        <h3 className="flex items-center gap-1 text-lg font-semibold leading-snug">
          <span className="truncate">{business.name}</span>
          {business.isVerified && <BadgeCheck className="size-4 shrink-0 text-primary" aria-label="Negocio verificado" />}
        </h3>
        <p className="text-sm text-muted-foreground">{[business.category?.name, business.neighborhood].filter(Boolean).join(' · ')}</p>
        {business.tagline && <p className="mt-2 line-clamp-2 text-sm">{business.tagline}</p>}
        <p className="mt-auto flex items-center gap-1.5 pt-3 text-xs font-medium text-muted-foreground">
          {delivers ? <Bike className="size-4" /> : <Store className="size-4" />}
          {delivers ? 'Delivery y retiro' : 'Solo retiro en el local'}
        </p>
      </div>
    </Link>
  );
}

export function BusinessCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border bg-card">
      <Skeleton className="aspect-[16/9] w-full rounded-none" />
      <div className="space-y-2 p-4">
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-full" />
      </div>
    </div>
  );
}
