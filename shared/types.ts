// Types shared by the server and the web app.

/** { success: true, data } or { success: false, error }; the error is shown to users, in Spanish. */
export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  error?: string;
  details?: unknown;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  isActive?: boolean;
}

/** Public user data: every seller is a business. */
export interface Business {
  id: string;
  slug: string;
  businessName: string;
  description?: string;
  logo?: string;
  coverImage?: string;
  whatsapp: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  /** JSON: {"monday": "09:00-18:00", "sunday": "closed", ...} */
  hours?: string;
  /** JSON: list of URLs. */
  gallery?: string;
  website?: string;
  isVerified: boolean;
  Products?: Product[];
}

/** Session user. */
export interface User extends Business {
  username: string;
  role: string;
  fullName?: string;
  email?: string;
  isActive?: boolean;
}

export interface Product {
  id: string;
  title: string;
  slug?: string;
  description?: string;
  price: number;
  /** JSON: list of image paths. */
  images: string;
  stock?: number;
  featured?: boolean;
  whatsapp?: string;
  isAvailable?: boolean;
  categoryId?: string;
  userId?: string;
  Category?: Category;
  User?: Pick<Business, 'id' | 'businessName' | 'slug' | 'whatsapp' | 'logo' | 'description'>;
}
