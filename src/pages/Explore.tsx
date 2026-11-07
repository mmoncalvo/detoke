import { useEffect, useState, useRef, useCallback } from 'react';
import { api, BASE_URL } from '@/api';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, Store, ShoppingBag } from 'lucide-react';
import ProductCard from '@/components/ProductCard';
import ProductModal from '@/components/ProductModal';

import type { Business, Category, Product } from '@shared/types';

export default function Explore() {
  const [searchParams] = useSearchParams();
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [activeTab, setActiveTab] = useState<'businesses' | 'products'>((searchParams.get('tab') as 'businesses' | 'products') || 'businesses');
  const [selectedCat, setSelectedCat] = useState<string>('');
  const [search, setSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Pagination
  const [visibleCount, setVisibleCount] = useState(12);
  const [loadingMore, setLoadingMore] = useState(false);
  const observerTarget = useRef(null);

  useEffect(() => {
    api.get('/categories').then(res => setCategories(res.data || res));
    api.get('/products').then(res => {
        const shuffled = (res.data || res).sort(() => 0.5 - Math.random());
        setProducts(shuffled);
    });
    api.get('/users').then(res => {
        const shuffled = (res.data || res).sort(() => 0.5 - Math.random());
        setBusinesses(shuffled);
    });
  }, []);

  // Reset visible items when the tab or filters change
  useEffect(() => {
    setVisibleCount(12);
  }, [activeTab, selectedCat, search]);

  const filteredProducts = products.filter(p => {
    const matchesCat = selectedCat ? p.Category?.id === selectedCat : true;
    const matchesSearch = p.title.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const filteredBusinesses = businesses.filter(b => {
    const matchesSearch = b.businessName.toLowerCase().includes(search.toLowerCase());
    const matchesCat = selectedCat ? products.some(p => p.userId === b.id && p.Category?.id === selectedCat) : true;
    return matchesSearch && matchesCat;
  });

  const handleObserver = useCallback((entries: any[]) => {
    const [entry] = entries;
    const currentList = activeTab === 'businesses' ? filteredBusinesses : filteredProducts;
    
    if (entry.isIntersecting && !loadingMore && visibleCount < currentList.length) {
      setLoadingMore(true);
      setTimeout(() => {
        setVisibleCount(prev => prev + 12);
        setLoadingMore(false);
      }, 300);
    }
  }, [loadingMore, activeTab, filteredBusinesses, filteredProducts, visibleCount]);

  useEffect(() => {
    const observer = new IntersectionObserver(handleObserver, { threshold: 1 });
    if (observerTarget.current) observer.observe(observerTarget.current);
    return () => { if (observerTarget.current) observer.unobserve(observerTarget.current); };
  }, [handleObserver]);

  const getImageUrl = (path: string | undefined | null) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    if (path.startsWith('/data/')) return `${BASE_URL}${path}`;
    return `${BASE_URL}/data/images/${path}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 dark:text-gray-100 pt-16">
      <ProductModal product={selectedProduct} isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        <header>
          <div className="flex flex-col gap-6 mb-8">
            {/* First row: title and tabs */}
            <div className="flex flex-wrap items-center gap-6">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Explorar</h1>
              <div className="flex bg-white dark:bg-gray-900 rounded-xl shadow-sm p-1 border border-gray-100 dark:border-gray-800">
                <button
                  onClick={() => setActiveTab('businesses')}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition ${activeTab === 'businesses' ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300' : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'}`}
                >
                  <Store size={16} />
                  Negocios
                </button>
                <button
                  onClick={() => setActiveTab('products')}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition ${activeTab === 'products' ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300' : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'}`}
                >
                  <ShoppingBag size={16} />
                  Productos
                </button>
              </div>
            </div>

            {/* Second row: search and tags */}
            <div className="flex flex-col md:flex-row gap-4 items-center">
              <div className="relative w-full md:w-64">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                </div>
                <input
                  type="text"
                  placeholder={activeTab === 'businesses' ? "Buscar negocios..." : "Buscar productos..."}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 pr-4 py-2.5 w-full border border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                />
              </div>

              <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
                <button
                  onClick={() => setSelectedCat('')}
                  className={`px-4 py-1.5 rounded-full text-xs whitespace-nowrap font-bold transition shadow-sm ${!selectedCat ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300' : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-400 border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                >
                  Todos
                </button>
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCat(cat.id)}
                    className={`px-4 py-1.5 rounded-full text-xs whitespace-nowrap font-bold transition shadow-sm ${selectedCat === cat.id ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300' : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-400 border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                  >
                    {cat.icon} {cat.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </header>

        <section>
          {activeTab === 'businesses' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredBusinesses.slice(0, visibleCount).map(b => (
                <Link key={b.id} to={`/negocio/${b.slug}`} className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden hover:shadow-lg transition-shadow duration-300 group">
                  <div className="h-48 overflow-hidden">
                    <img 
                      src={getImageUrl(b.coverImage) || ''} 
                      alt={b.businessName} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                    />
                  </div>
                  <div className="p-5">
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-1">{b.businessName}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">{b.description}</p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredProducts.slice(0, visibleCount).map(product => (
                <ProductCard 
                  key={product.id} 
                  product={product} 
                  onModalToggle={(isOpen: boolean) => {
                    setSelectedProduct(product);
                    setIsModalOpen(isOpen);
                  }}
                />
              ))}
            </div>
          )}
          
          <div ref={observerTarget} className="h-24 mt-4 flex items-center justify-center">
            {loadingMore && (
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
            )}
          </div>
          
          {(activeTab === 'businesses' ? filteredBusinesses.length === 0 : filteredProducts.length === 0) && (
            <p className="text-center text-gray-400 py-12 w-full">No encontramos elementos</p>
          )}
        </section>
      </main>
    </div>
  );
}
