import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, BASE_URL } from '@/lib/api';
import ProductCard from '@/components/ProductCard';
import ProductModal from '@/components/ProductModal';
import { Store, Sparkles } from 'lucide-react';

interface Category { id: string; name: string; icon: string }
interface Product { id: string; title: string; price: number; images: string; description?: string; User?: any }
interface Business { id: string; businessName: string; description?: string; imagenPortada?: string; slug: string; estaVerificado: boolean }

export default function Home() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [featured, setFeatured] = useState<Product[]>([]);
  const [nextFeatured, setNextFeatured] = useState<Product[]>([]);
  const [fade, setFade] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const getImageUrl = (path: string | undefined | null) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    if (path.startsWith('/data/')) return `${BASE_URL}${path}`;
    return `${BASE_URL}/data/images/${path}`;
  };

  useEffect(() => {
    api.get('/usuarios').then(res => setBusinesses((res.data || res).sort(() => 0.5 - Math.random())));
    api.get('/productos').then(res => setProducts(res.data || res));
  }, []);

  useEffect(() => {
    if (products.length > 0) {
      const initial = [...products].sort(() => 0.5 - Math.random()).slice(0, 15);
      setFeatured(initial);
      setNextFeatured(initial);
    }
  }, [products]);

  useEffect(() => {
    if (isPaused || products.length === 0) return;

    const rotate = () => {
      const nextBatch = [...products].sort(() => 0.5 - Math.random()).slice(0, 15);
      setNextFeatured(nextBatch);
      setFade(true);
      
      setTimeout(() => {
        setFeatured(nextBatch);
        setFade(false);
      }, 1500);
    };
    
    const interval = setInterval(rotate, 7000);
    return () => clearInterval(interval);
  }, [products, isPaused]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 dark:text-gray-100 pt-16">
      <header className="bg-white dark:bg-gray-900 border-b dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Detoke</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Comida y productos cerca de vos</p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-12">
        <ProductModal product={selectedProduct} isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setIsPaused(false); }} />

        {/* Negocios destacados */}
        {businesses.length > 0 && (
          <section>
            <div className="flex items-center gap-3 mb-6">
              <Store className="text-emerald-600 dark:text-emerald-400" size={28} />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Negocios destacados</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {businesses.slice(0, 9).map(b => (
                <Link
                  key={b.id}
                  to={`/negocio/${b.slug || b.id}`}
                  className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden hover:shadow-lg transition-shadow duration-300 group"
                >
                  <div className="h-48 overflow-hidden">
                    <img 
                      src={getImageUrl(b.imagenPortada) || ''} 
                      alt={b.businessName} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                    />
                  </div>
                  <div className="p-5">
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-1">{b.businessName}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">{b.description}</p>
                    {b.estaVerificado && (
                      <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-2 block">✓ Verificado</span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Productos Destacados */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Sparkles className="text-emerald-600 dark:text-emerald-400" size={28} />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Productos destacados</h2>
            </div>
            <Link to="/explorar?tab=products" className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700">Ver todos →</Link>
          </div>
          <div className="relative min-h-[400px]">
            {/* Old Grid */}
            <div className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 transition-opacity duration-[1500ms] ease-in-out absolute inset-0 ${fade ? 'opacity-0' : 'opacity-100'}`}>
              {featured.map(product => (
                <ProductCard 
                  key={product.id} 
                  product={product} 
                  onModalToggle={(isOpen: boolean) => {
                    setIsPaused(isOpen);
                    setSelectedProduct(product);
                    setIsModalOpen(isOpen);
                  }}
                />
              ))}
            </div>
            {/* New Grid */}
            <div className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 transition-opacity duration-[1500ms] ease-in-out absolute inset-0 ${fade ? 'opacity-100' : 'opacity-0'}`}>
              {nextFeatured.map(product => (
                <ProductCard 
                  key={product.id} 
                  product={product} 
                  onModalToggle={(isOpen: boolean) => {
                    setIsPaused(isOpen);
                    setSelectedProduct(product);
                    setIsModalOpen(isOpen);
                  }}
                />
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
