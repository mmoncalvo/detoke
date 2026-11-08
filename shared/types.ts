// Types shared by the server and the web app.
import type { BusinessHours, DeliveryOption, PaymentMethod } from './business.js';

/** { success: true, data } or { success: false, error }; the error is shown to users, in Spanish. */
export type ApiResponse<T> = { success: true; data: T } | { success: false; error: string; details?: unknown };

export interface BusinessCategory {
  id: string;
  name: string;
  slug: string;
  /** Icon key, see src/lib/category-icons.ts. */
  icon: string;
  businessCount?: number;
}

export interface ProductCategory {
  id: string;
  name: string;
  slug: string;
  position?: number;
}

export interface Business {
  id: string;
  ownerId: string;
  name: string;
  slug: string;
  businessCategoryId: string;
  category?: BusinessCategory;
  tagline: string | null;
  description: string | null;
  logo: string | null;
  coverImage: string | null;
  gallery: string[];
  whatsapp: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  instagram: string | null;
  facebook: string | null;
  address: string | null;
  neighborhood: string | null;
  city: string | null;
  province: string | null;
  postalCode: string | null;
  latitude: number | null;
  longitude: number | null;
  hours: BusinessHours;
  deliveryOptions: DeliveryOption[];
  deliveryFee: number | null;
  minimumOrder: number | null;
  deliveryRadiusKm: number | null;
  paymentMethods: PaymentMethod[];
  isVerified: boolean;
  isActive: boolean;
  productCount?: number;
  products?: Product[];
}

export type BusinessSummary = Pick<Business, 'id' | 'name' | 'slug' | 'logo' | 'whatsapp' | 'hours' | 'deliveryOptions' | 'deliveryFee' | 'minimumOrder' | 'paymentMethods'>;

export interface Product {
  id: string;
  businessId: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  compareAtPrice: number | null;
  images: string[];
  /** null means stock is not tracked. */
  stock: number | null;
  isAvailable: boolean;
  featured: boolean;
  productCategoryId: string | null;
  category?: ProductCategory | null;
  business?: BusinessSummary;
}

export interface User {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: 'seller' | 'admin';
  avatarUrl?: string | null;
}

export type Impersonator = Pick<User, 'id' | 'name' | 'email'>;

export interface Session {
  token: string;
  user: User;
  business: Business | null;
  /** Set while an admin is acting on behalf of this user. */
  impersonatedBy?: Impersonator | null;
}

/** A row of the admin accounts list. */
export interface AdminAccount {
  user: User & { createdAt: string };
  business: (Pick<Business, 'id' | 'name' | 'slug' | 'logo' | 'isActive' | 'isVerified'> & { category: BusinessCategory | null }) | null;
  productCount: number;
  profile: { done: number; total: number; complete: boolean };
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pages: number;
}

export type SearchResult =
  | { type: 'business'; id: string; title: string; subtitle: string; slug: string; image: string | null }
  | { type: 'product'; id: string; title: string; subtitle: string; slug: string; image: string | null; price: number }
  | { type: 'category'; id: string; title: string; subtitle: string; slug: string; icon: string };
