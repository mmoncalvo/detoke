import { Beef, Candy, Carrot, Croissant, Drumstick, Ham, IceCreamCone, Leaf, Pizza, ShoppingBag, ShoppingCart, SprayCan, Store, Utensils, Wine, type LucideIcon } from 'lucide-react';

const ICONS: Record<string, LucideIcon> = {
  beef: Beef,
  candy: Candy,
  carrot: Carrot,
  croissant: Croissant,
  drumstick: Drumstick,
  ham: Ham,
  'ice-cream': IceCreamCone,
  leaf: Leaf,
  pizza: Pizza,
  'shopping-bag': ShoppingBag,
  'shopping-cart': ShoppingCart,
  'spray-can': SprayCan,
  store: Store,
  utensils: Utensils,
  wine: Wine,
};

export const categoryIcon = (icon?: string) => (icon && ICONS[icon]) || Store;
