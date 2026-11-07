// Tipos que viajan entre el servidor y la web.

/** { success: true, data } o { success: false, error }, con el error en español. */
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

/** Datos públicos de un usuario: cada vendedor es un negocio. */
export interface Business {
  id: string;
  slug: string;
  businessName: string;
  description?: string;
  logo?: string;
  imagenPortada?: string;
  whatsapp: string;
  address?: string;
  latitud?: number;
  longitud?: number;
  /** JSON: {"lunes": "09:00-18:00", ...} */
  horario?: string;
  /** JSON: lista de URLs. */
  galeria?: string;
  sitioWeb?: string;
  estaVerificado: boolean;
  Products?: Product[];
}

/** Usuario de la sesión. */
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
  /** JSON: lista de rutas de imágenes. */
  images: string;
  stock?: number;
  destacado?: boolean;
  whatsapp?: string;
  isAvailable?: boolean;
  categoryId?: string;
  userId?: string;
  Category?: Category;
  User?: Pick<Business, 'id' | 'businessName' | 'slug' | 'whatsapp' | 'logo' | 'description'>;
}
