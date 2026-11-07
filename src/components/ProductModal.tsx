import { useEffect } from 'react';
import { X, ShoppingCart } from 'lucide-react';
import { BASE_URL } from '@/api';
import { useCart } from '@/context/CartContext';
import type { Product } from '@shared/types';

interface ProductModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function ProductModal({ product, isOpen, onClose }: ProductModalProps) {
  const { addToCart } = useCart();

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen || !product) return null;

  const images = JSON.parse(product.images || '[]');
  const imageUrl = images.length > 0 
    ? (images[0].startsWith('http') ? images[0] : `${BASE_URL}/data/images/${images[0]}`) 
    : null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden relative border dark:border-gray-800 flex flex-col md:flex-row h-auto max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 z-20 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full transition">
          <X size={20} />
        </button>
        
        {/* Columna Izquierda: Imagen (60%) */}
        <div className="w-full md:w-3/5 bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden">
          {imageUrl ? (
            <img src={imageUrl} alt={product.title} className="w-full h-full object-cover" />
          ) : (
            <div className="text-8xl p-12">📦</div>
          )}
        </div>
        
        {/* Columna Derecha: Contenido (40%) */}
        <div className="w-full md:w-2/5 p-8 flex flex-col justify-between bg-white dark:bg-gray-900">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white leading-tight">{product.title}</h2>
            <p className="text-gray-600 dark:text-gray-400 mt-4 text-base leading-relaxed">{product.description}</p>
          </div>
          
          <div className="mt-8">
            <p className="text-emerald-600 dark:text-emerald-400 font-bold text-3xl">${Number(product.price).toFixed(2)}</p>
            <button 
              onClick={() => { addToCart(product); onClose(); }}
              className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white py-4 rounded-xl font-bold mt-6 transition shadow-lg hover:shadow-emerald-500/20"
            >
              <ShoppingCart size={20} /> Agregar al pedido
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
