import { useState } from 'react';
import { BASE_URL } from '@/api';

interface BusinessHeaderProps {
  businessName: string;
  description?: string;
  logo?: string;
  imagenPortada?: string;
  whatsapp: string;
  estaVerificado: boolean;
  address?: string;
  slug: string;
  sitioWeb?: string; // New field
}

export default function BusinessHeader({ 
  businessName, 
  description, 
  logo, 
  imagenPortada, 
  whatsapp, 
  estaVerificado,
  address,
  slug,
  sitioWeb
}: BusinessHeaderProps) {
  const [coverError, setCoverError] = useState(false);
  const [logoError, setLogoError] = useState(false);
  
  const getImageUrl = (path: string | undefined) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    // Prepend BASE_URL for paths starting with /data/
    if (path.startsWith('/data/')) return `${BASE_URL}${path}`;
    // Si es solo un nombre de archivo, es una imagen de semilla (data/images)
    return `${BASE_URL}/data/images/${path}`;
  };
  
  const coverUrl = getImageUrl(imagenPortada);
  const logoUrl = getImageUrl(logo);
  
  return (
    <div className="relative">
      {/* Portada */}
      <div className="w-full h-64 md:h-80 bg-gradient-to-r from-emerald-500 to-emerald-600 relative overflow-hidden">
        {coverUrl && !coverError ? (
          <img src={coverUrl} alt={businessName} className="w-full h-full object-cover" onError={() => setCoverError(true)} />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-9xl opacity-20">🏪</span>
          </div>
        )}
        <div className="absolute inset-0 bg-black/30" />
      </div>
      
      {/* Info */}
      <div className="max-w-7xl mx-auto px-4 -mt-16 relative z-10">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-6 border border-transparent dark:border-gray-800">
          <div className="flex flex-col md:flex-row items-start gap-6">
            {/* Logo */}
            <div className="w-24 h-24 md:w-32 md:h-32 bg-white dark:bg-gray-800 rounded-2xl shadow-md -mt-16 border-4 border-white dark:border-gray-900 overflow-hidden flex items-center justify-center text-6xl">
              {logoUrl && !logoError ? (
                <img src={logoUrl} alt={businessName} className="w-full h-full object-cover" onError={() => setLogoError(true)} />
              ) : (
                <span className="dark:text-gray-200">🏪</span>
              )}
            </div>
            
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{businessName}</h1>
                {estaVerificado && (
                  <span className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-medium px-3 py-1 rounded-full">
                    ✓ Verificado
                  </span>
                )}
              </div>
              {description && (
                <p className="text-gray-600 dark:text-gray-400 mb-3">{description}</p>
              )}
              {address && (
                <p className="text-sm text-gray-500 dark:text-gray-500 flex items-center gap-1">
                  📍 {address}
                </p>
              )}
              {sitioWeb && (
                <a 
                  href={sitioWeb} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 mt-1"
                >
                  🌐 {sitioWeb.replace(/https?:\/\//, '')}
                </a>
              )}
            </div>
                        
            <a
              href={`https://wa.me/${whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola! Te contacto desde Detoke sobre ${businessName}`)}`}
              target="_blank"
              rel="noopener"
              className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-xl font-medium transition"
            >
              <span>💬</span> Contactar por WhatsApp
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
