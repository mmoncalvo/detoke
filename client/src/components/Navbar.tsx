import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { useTheme } from '@/contexts/ThemeContext';
import { ShoppingCart, Sun, Moon } from 'lucide-react';

export default function Navbar({ onSearchOpen }: { onSearchOpen: () => void }) {
  const { token, logout } = useAuth();
  const { items } = useCart();
  const { theme, toggleTheme } = useTheme();
  const cartCount = items.reduce((acc, item) => acc + item.quantity, 0);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    if (cartCount > 0) {
      setAnimate(true);
      const timer = setTimeout(() => setAnimate(false), 500);
      return () => clearTimeout(timer);
    }
  }, [cartCount]);

  return (
    <nav className="fixed top-0 left-0 right-0 z-[100] bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 h-16 grid grid-cols-3 items-center">
        {/* Left: Logo */}
        <div className="flex justify-start">
          <Link to="/" className="text-xl font-bold text-emerald-600 dark:text-emerald-400">Detoke</Link>
        </div>

        {/* Center: Search */}
        <div className="flex justify-center">
            <button
              onClick={onSearchOpen}
              className="hidden md:flex items-center gap-3 px-3 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 dark:text-gray-500 rounded-xl transition-colors w-64 text-sm border border-transparent hover:border-gray-300 dark:hover:border-gray-700"
            >
              <span className="text-lg">🔍</span>
              <span className="flex-1 text-left">Buscar...</span>
              <kbd className="text-[10px] font-sans font-semibold bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-1.5 py-0.5 rounded border dark:border-gray-600 shadow-sm">K</kbd>
            </button>
        </div>

        {/* Right: Menu */}
        <div className="flex items-center justify-end gap-4">
          <Link to="/" className="hidden sm:block text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">Inicio</Link>
          <Link to="/explorar" className="hidden sm:block text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">Explorar</Link>
          
          <button onClick={toggleTheme} className="p-2 text-gray-600 dark:text-gray-300 hover:text-emerald-600 dark:hover:text-emerald-400">
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>

          <Link to="/checkout" className="relative p-2 text-gray-600 dark:text-gray-300 hover:text-emerald-600 dark:hover:text-emerald-400">
            <ShoppingCart size={20} />
            {cartCount > 0 && (
              <span className={`absolute -top-1 -right-1 bg-emerald-600 text-white text-[10px] min-w-[18px] h-[18px] flex items-center justify-center rounded-full font-bold transition-transform duration-300 px-1 ${animate ? 'scale-125' : 'scale-100'}`}>
                {cartCount}
              </span>
            )}
          </Link>

          {token ? (
            <>
              <Link to="/dashboard" className="text-sm text-gray-600 hover:text-gray-900 text-nowrap">Mi Dashboard</Link>
              <button
                onClick={() => { logout(); }}
                className="text-sm text-red-500 hover:text-red-700"
              >
                Salir
              </button>
            </>
          ) : (
            <Link
              to="/login"
              className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-medium"
            >
              Ingresar
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
