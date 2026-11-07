import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { whatsappLink, BASE_URL } from '@/api';
import { useCart } from '@/context/CartContext';
import { ShoppingCart, X } from 'lucide-react';
import type { Product } from '@shared/types';

export default function ProductCard({ product, hideLogo = false, onModalToggle }: { product: Product, hideLogo?: boolean, onModalToggle?: (isOpen: boolean) => void }) {
  const [imgError, setImgError] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const { addToCart } = useCart();
  const images = JSON.parse(product.images || '[]');
  const firstImage = images.length > 0 ? images[0] : null;
  const emoji = getProductEmoji(product.title);

  const getImageUrl = (path: string | undefined | null) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    if (path.startsWith('/data/')) return `${BASE_URL}${path}`;
    return `${BASE_URL}/data/images/${path}`;
  };

  const business = product.User;
  const logoUrl = getImageUrl(business?.logo);
  
  const [isAnimating, setIsAnimating] = useState(false);

  const handleAddToCart = () => {
    addToCart(product);
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 800);
  };

  return (
    <div id={`product-${product.id}`} className={`bg-white dark:bg-gray-900 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 p-4 flex flex-col gap-3 relative border border-gray-100 dark:border-gray-800 h-full ${isAnimating ? 'bg-emerald-50/50 dark:bg-emerald-900/10' : ''}`}>
      <div className="relative aspect-square bg-gray-50 dark:bg-gray-800 rounded-xl flex items-center justify-center text-8xl overflow-hidden cursor-pointer" onClick={() => onModalToggle && onModalToggle(true)}>
        {!imgError && firstImage ? (
          <img 
            src={getImageUrl(firstImage) || ''} 
            alt={product.title} 
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
            loading="lazy"
          />
        ) : (
          <span className="text-8xl">{emoji}</span>
        )}

        {!hideLogo && business && (
          <div className="absolute -bottom-2 -left-2 z-20 flex items-center gap-2">
            <Link 
              to={`/negocio/${business.slug || business.id}`}
              className="w-14 h-14 rounded-xl border-4 border-white dark:border-gray-900 shadow-xl overflow-hidden bg-white dark:bg-gray-800"
            >
              {logoUrl && !logoError ? (
                <img src={logoUrl} alt={business.businessName} className="w-full h-full object-cover" onError={() => setLogoError(true)} />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xl">🏪</div>
              )}
            </Link>
            <div className="bg-black/60 backdrop-blur-sm text-white px-3 py-1 rounded-lg text-xs font-medium truncate max-w-[120px] shadow-md">
              {business.businessName}
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 mt-6">
        <h3 className="font-semibold text-gray-900 dark:text-white truncate">{product.title}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2 min-h-[40px]">{product.description}</p>
        <p className="text-emerald-600 dark:text-emerald-400 font-bold mt-2">${Number(product.price).toFixed(2)}</p>
      </div>

      <button 
        onClick={handleAddToCart}
        className={`w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white py-2.5 rounded-xl font-medium transition ${isAnimating ? 'animate-pulse bg-emerald-600' : ''}`}
      >
        <ShoppingCart size={18} /> Agregar
      </button>
    </div>
  );
}

function getProductEmoji(title: string) {
  if (title.toLowerCase().includes('pizza')) return '🍕';
  if (title.toLowerCase().includes('hamburguesa')) return '🍔';
  if (title.toLowerCase().includes('empanada')) return '🥟';
  if (title.toLowerCase().includes('pan')) return '🍞';
  if (title.toLowerCase().includes('queso')) return '🧀';
  if (title.toLowerCase().includes('manzana')) return '🍎';
  if (title.toLowerCase().includes('banana')) return '🍌';
  return '📦';
}
