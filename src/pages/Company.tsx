import { useEffect, useState } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import { api, whatsappLink } from '@/api';
import { useAuth } from '@/context/AuthContext';
import ProductCard from '@/components/ProductCard';
import ProductModal from '@/components/ProductModal';
import BusinessHeader from '@/components/BusinessHeader';
import BusinessMap from '@/components/BusinessMap';
import ImageGallery from '@/components/ImageGallery';
import BusinessHours from '@/components/BusinessHours';

import type { Business, Product } from '@shared/types';

export default function Company() {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const prodId = searchParams.get('prodId');
  const { user } = useAuth();
  const [company, setCompany] = useState<Business | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (prodId && products.length > 0) {
      const element = document.getElementById(`product-${prodId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.classList.add('highlight-product');
        setTimeout(() => {
          element.classList.remove('highlight-product');
        }, 3000);
      }
    }
  }, [prodId, products]);

  useEffect(() => {
    if (!slug) {
      setError('No se proporcionó slug de empresa');
      return;
    }

    const fetchCompany = async () => {
      try {
        const res = await api.get(`/users/slug/${slug}`);
        if (res.success && res.data) {
          setCompany(res.data);
          setError(null);
        } else {
          throw new Error(res.error || 'No encontrado');
        }
      } catch (err: any) {
        setError(`No se pudo cargar la empresa: ${err.message}`);
      }
    };

    fetchCompany();
  }, [slug]);

  useEffect(() => {
    if (company?.id) {
      api.get(`/users/${company.id}/products`)
        .then(res => setProducts(res.data || res))
        .catch(err => console.error('Error fetching products', err));
    }
  }, [company?.id]);

  if (error) return (
    <div className="p-8 text-center">
      <p className="text-red-500 mb-4">{error}</p>
      <button
        onClick={() => window.location.reload()}
        className="bg-emerald-500 text-white px-4 py-2 rounded-xl"
      >
        Reintentar
      </button>
    </div>
  );

  if (!company) return <div className="p-8 text-center">Cargando...</div>;

  const galleryImages = company.gallery ? JSON.parse(company.gallery) : [];
  const isOwner = user && user.id === company.id;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 dark:text-gray-100 pt-16">
      <ProductModal product={selectedProduct} isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      {isOwner && (
        <div className="bg-emerald-600 text-white px-4 py-2 flex items-center justify-between sticky top-0 z-10 shadow-md">
          <p className="text-sm font-medium flex items-center gap-2">
            <span>✨</span> Estás viendo tu propio negocio
          </p>
          <Link
            to="/dashboard"
            className="bg-white text-emerald-600 px-4 py-1.5 rounded-xl text-xs font-bold hover:bg-emerald-50 transition-colors uppercase tracking-wider"
          >
            Panel de Control
          </Link>
        </div>
      )}
      <BusinessHeader
        businessName={company.businessName}
        description={company.description}
        logo={company.logo}
        coverImage={company.coverImage}
        whatsapp={company.whatsapp}
        isVerified={company.isVerified}
        address={company.address}
        slug={company.slug}
        website={company.website}
      />

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Map and hours grid */}
        {(company.latitude && company.longitude || company.hours) && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-stretch">
            {company.hours && (
              <div className="md:col-span-5 h-full">
                <BusinessHours hours={company.hours} />
              </div>
            )}
            {company.latitude && company.longitude && (
              <div className="md:col-span-7 h-full min-h-[300px]">
                <div className="h-full">
                  <BusinessMap
                    center={[company.latitude, company.longitude]}
                    address={company.address || ''}
                    businessName={company.businessName}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Gallery */}
        <div className="mb-20">
          <ImageGallery images={galleryImages} />
        </div>

        {/* Featured products */}
        <section className="mt-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Productos destacados</h2>
            <div className="relative w-full md:w-64">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400 dark:text-gray-500" />
              </div>
              <input
                type="text"
                placeholder="Buscar productos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2.5 w-full border border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {products
              .filter(p => p.title.toLowerCase().includes(searchTerm.toLowerCase()))
              .map(product => (
              <ProductCard 
                key={product.id} 
                product={{ ...product, User: company }} 
                hideLogo={true}
                onModalToggle={(isOpen: boolean) => {
                  setSelectedProduct(product);
                  setIsModalOpen(isOpen);
                }}
              />
            ))}
          </div>
          {products.filter(p => p.title.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 && (
            <p className="text-center text-gray-400 dark:text-gray-500 py-12">No se encontraron productos con ese nombre</p>
          )}
        </section>
      </main>
    </div>
  );
}
