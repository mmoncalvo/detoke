import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { BusinessSummary, Product } from '@shared/types';

const STORAGE_KEY = 'detoke.cart';

export interface CartItem {
  id: string;
  name: string;
  price: number;
  image: string | null;
  quantity: number;
  business: BusinessSummary;
}

export interface CartGroup {
  business: BusinessSummary;
  items: CartItem[];
  subtotal: number;
}

interface CartState {
  items: CartItem[];
  groups: CartGroup[];
  count: number;
  isOpen: boolean;
  setOpen: (open: boolean) => void;
  add: (product: Product, business: BusinessSummary, quantity?: number) => void;
  setQuantity: (id: string, quantity: number) => void;
  removeBusiness: (businessId: string) => void;
  quantityOf: (id: string) => number;
}

const CartContext = createContext<CartState | null>(null);

function readCart(): CartItem[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(readCart);
  const [isOpen, setOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* storage not available */
    }
  }, [items]);

  const add = useCallback((product: Product, business: BusinessSummary, quantity = 1) => {
    setItems((current) => {
      if (current.some((item) => item.id === product.id)) {
        return current.map((item) => (item.id === product.id ? { ...item, quantity: item.quantity + quantity } : item));
      }
      return [...current, { id: product.id, name: product.name, price: product.price, image: product.images[0] ?? null, quantity, business }];
    });
  }, []);

  const setQuantity = useCallback((id: string, quantity: number) => {
    setItems((current) => (quantity <= 0 ? current.filter((item) => item.id !== id) : current.map((item) => (item.id === id ? { ...item, quantity } : item))));
  }, []);

  const removeBusiness = useCallback((businessId: string) => {
    setItems((current) => current.filter((item) => item.business.id !== businessId));
  }, []);

  const value = useMemo(() => {
    const byBusiness = new Map<string, CartGroup>();
    for (const item of items) {
      const group = byBusiness.get(item.business.id) ?? { business: item.business, items: [], subtotal: 0 };
      group.items.push(item);
      group.subtotal += item.price * item.quantity;
      byBusiness.set(item.business.id, group);
    }
    return {
      items,
      groups: [...byBusiness.values()],
      count: items.reduce((sum, item) => sum + item.quantity, 0),
      isOpen,
      setOpen,
      add,
      setQuantity,
      removeBusiness,
      quantityOf: (id: string) => items.find((item) => item.id === id)?.quantity ?? 0,
    };
  }, [items, isOpen, add, setQuantity, removeBusiness]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within CartProvider');
  return context;
}
