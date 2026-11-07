// What a business still has to fill in, shown in the seller dashboard.
import { hasHours } from './business.js';
import type { Business } from './types.js';

export interface ProfileStep {
  key: string;
  label: string;
  done: boolean;
  /** Dashboard route that fixes it. */
  to: string;
}

export function profileChecklist(business: Business, productCount: number): ProfileStep[] {
  return [
    { key: 'logo', label: 'Subí tu logo', done: !!business.logo, to: '/dashboard/business' },
    { key: 'cover', label: 'Sumá una foto de portada', done: !!business.coverImage, to: '/dashboard/business' },
    { key: 'description', label: 'Contá de qué se trata tu negocio', done: !!business.description, to: '/dashboard/business' },
    { key: 'location', label: 'Marcá tu ubicación en el mapa', done: business.latitude != null && !!business.address, to: '/dashboard/business' },
    { key: 'hours', label: 'Cargá tus horarios', done: hasHours(business.hours), to: '/dashboard/hours' },
    { key: 'products', label: 'Publicá al menos tres productos', done: productCount >= 3, to: '/dashboard/products' },
    { key: 'gallery', label: 'Agregá fotos a tu galería', done: business.gallery.length > 0, to: '/dashboard/gallery' },
  ];
}
