import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, BASE_URL } from '@/api';

interface SearchResult {
  id: string;
  type: 'negocio' | 'producto' | 'categoria';
  title: string;
  slug?: string;
  logo?: string;
  images?: string;
  price?: number;
  icon: string;
  subtitle: string;
}

export default function SearchGlobal({ isOpen, setIsOpen }: { isOpen: boolean, setIsOpen: (open: boolean) => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  // Lock body scroll when open
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

  // Keyboard shortcut Ctrl+K or Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setQuery('');
      setResults([]);
      setSelectedIndex(-1);
    }
  }, [isOpen]);

  // Real-time search - Instant
  useEffect(() => {
    if (query.length === 0) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    const performSearch = async () => {
      setIsLoading(true);
      try {
        const res = await api.get(`/search?q=${encodeURIComponent(query)}`);
        if (res.success) {
          setResults(res.data);
          setSelectedIndex(res.data.length > 0 ? 0 : -1);
        }
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    performSearch();
  }, [query]);

  const handleSelect = (result: SearchResult) => {
    setIsOpen(false);
    if (result.type === 'negocio') {
      navigate(`/negocio/${result.slug}`);
    } else if (result.type === 'producto') {
      navigate(`/negocio/${result.slug}?prodId=${result.id}`);
    } else if (result.type === 'categoria') {
      navigate(`/?cat=${result.id}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < results.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      handleSelect(results[selectedIndex]);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] w-full h-full bg-transparent flex items-start justify-center pt-[10vh] overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-gray-900/60 dark:bg-black/80 backdrop-blur-md" onClick={() => setIsOpen(false)} />

      {/* Modal */}
      <div className="relative w-full mx-4 max-w-xl bg-white dark:bg-gray-900/80 dark:backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden border dark:border-gray-800/50">
        <div className="flex items-center px-4 py-3 border-b border-gray-100 dark:border-gray-800/50">
          <span className="text-xl">🔍</span>
          <input
            ref={inputRef}
            type="text"
            className="flex-1 ml-3 bg-transparent border-none outline-none text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-lg"
            placeholder="¿Qué estás buscando?"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button onClick={() => setIsOpen(false)} className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 font-bold border dark:border-gray-700 rounded px-1.5 py-0.5">ESC</button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2">
          {isLoading && (
            <div className="py-12 text-center text-gray-500 dark:text-gray-400">
              <div className="animate-spin inline-block w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full mb-2"></div>
              <p>Buscando...</p>
            </div>
          )}

          {!isLoading && results.length > 0 && (
            <div className="space-y-1">
              {results.map((result, index) => (
                <div
                  key={`${result.type}-${result.id}`}
                  onClick={() => handleSelect(result)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors ${index === selectedIndex ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-900 dark:text-emerald-50' : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl overflow-hidden ${index === selectedIndex ? 'bg-white dark:bg-gray-700 shadow-sm' : 'bg-gray-100 dark:bg-gray-800'
                    }`}>
                    {(() => {
                      let imageUrl = null;
                      if (result.type === 'negocio' && result.logo) {
                        imageUrl = result.logo.startsWith('http') ? result.logo : `${BASE_URL}/data/images/${result.logo}`;
                      } else if (result.type === 'producto' && result.images) {
                        try {
                          const parsed = JSON.parse(result.images);
                          if (parsed.length > 0) {
                            imageUrl = parsed[0].startsWith('http') ? parsed[0] : `${BASE_URL}/data/images/${parsed[0]}`;
                          }
                        } catch (e) {
                          console.error('Error parsing images in search result', e);
                        }
                      }

                      return imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={result.title}
                          className="w-full h-full object-cover"
                          onError={(e) => (e.currentTarget.style.display = 'none')}
                        />
                      ) : (
                        <span className="dark:text-gray-300">{result.icon}</span>
                      );
                    })()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate dark:text-white">{result.title}</p>
                    <p className={`text-xs ${index === selectedIndex ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-500 dark:text-gray-400'}`}>
                      {result.subtitle} {result.price ? `· $${result.price}` : ''}
                    </p>
                  </div>
                  {index === selectedIndex && (
                    <span className="text-emerald-500 dark:text-emerald-400">⏎</span>
                  )}
                </div>
              ))}
            </div>
          )}

          {!isLoading && query.length >= 2 && results.length === 0 && (
            <div className="py-12 text-center">
              <span className="text-4xl block mb-2">😕</span>
              <p className="text-gray-500 dark:text-gray-400">No encontramos nada que coincida con "{query}"</p>
            </div>
          )}

          {query.length === 0 && (
            <div className="py-8 text-center text-gray-400 dark:text-gray-500">
              <p className="text-sm">Empieza a escribir para buscar negocios o productos</p>
            </div>
          )}
        </div>

        <div className="bg-gray-50 dark:bg-gray-800/50 px-4 py-3 flex items-center justify-between text-[10px] text-gray-400 dark:text-gray-500 font-semibold uppercase tracking-wider border-t dark:border-gray-800">
          <div className="flex gap-4">
            <span className="flex items-center gap-1">
              <kbd className="bg-white dark:bg-gray-700 border dark:border-gray-600 px-1 rounded shadow-sm text-gray-400 dark:text-gray-500">↑↓</kbd> Navegar
            </span>
            <span className="flex items-center gap-1">
              <kbd className="bg-white dark:bg-gray-700 border dark:border-gray-600 px-1 rounded shadow-sm text-gray-400 dark:text-gray-500">⏎</kbd> Seleccionar
            </span>
          </div>
          <span>Buscador Detoke</span>
        </div>
      </div>
    </div>
  );
}
