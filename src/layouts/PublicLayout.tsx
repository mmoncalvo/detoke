import { LayoutDashboard, LogIn, Search, ShoppingBag } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { BrandMark } from '@/components/common/BrandMark';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { CartSheet } from '@/components/layout/CartSheet';
import { ImpersonationBanner } from '@/components/layout/ImpersonationBanner';
import { SearchDialog } from '@/components/layout/SearchDialog';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';

export default function PublicLayout() {
  const { user } = useAuth();
  const { count, setOpen } = useCart();
  const [searchOpen, setSearchOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="flex min-h-svh flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-2 focus:rounded-md focus:bg-card focus:px-3 focus:py-2">Saltar al contenido</a>
      <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
        <ImpersonationBanner />
        <div className="mx-auto flex h-16 max-w-page items-center gap-1 px-4 sm:gap-2">
          <BrandMark compact />
          <nav className="ml-1 block sm:ml-6" aria-label="Principal">
            <NavLink to="/explorar" className={({ isActive }) => `rounded-md px-2 py-2 text-sm sm:px-3 font-medium hover:bg-secondary ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>Explorar</NavLink>
            <NavLink to="/contact" className={({ isActive }) => `hidden rounded-md px-3 py-2 text-sm font-medium hover:bg-secondary md:inline-block ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>Contacto</NavLink>
          </nav>

          <button
            onClick={() => setSearchOpen(true)}
            className="ml-auto hidden h-10 w-72 items-center gap-2 rounded-lg border bg-card px-3 text-sm text-muted-foreground transition-colors hover:border-primary/40 md:flex"
          >
            <Search className="size-4" />
            <span className="flex-1 text-left">Buscar en el barrio</span>
            <kbd className="rounded bg-secondary px-1.5 py-0.5 text-[10px] font-medium">⌘K</kbd>
          </button>

          <div className="ml-auto flex items-center md:ml-2 sm:gap-1">
            <Button variant="ghost" size="icon" className="size-9 md:hidden" aria-label="Buscar" onClick={() => setSearchOpen(true)}><Search className="size-5" /></Button>
            <ThemeToggle className="size-9 sm:size-10" />
            <Button variant="ghost" size="icon" className="relative size-9 sm:size-10" aria-label={`Ver pedido, ${count} productos`} onClick={() => setOpen(true)}>
              <ShoppingBag className="size-5" />
              {count > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-tomato px-1 text-[11px] font-bold text-white">{count}</span>}
            </Button>
            {user ? (
              <Button asChild variant="outline" className="ml-1 size-9 p-0 sm:h-10 sm:w-auto sm:px-4">
                <Link to="/dashboard" aria-label="Mi panel"><LayoutDashboard /> <span className="hidden sm:inline">Mi panel</span></Link>
              </Button>
            ) : (
              <Button asChild variant="outline" className="ml-1 size-9 p-0 sm:h-10 sm:w-auto sm:px-4"><Link to="/login" aria-label="Ingresar"><LogIn className="sm:hidden" /> <span className="hidden sm:inline">Ingresar</span></Link></Button>
            )}
          </div>
        </div>
      </header>

      <main id="main" className="flex-1"><Outlet /></main>

      <footer className="mt-16 bg-sidebar text-sidebar-foreground">
        <div className="awning" aria-hidden />
        <div className="mx-auto flex max-w-page flex-col gap-4 px-4 py-10 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <BrandMark inverted />
            <p className="mt-2 max-w-sm text-sm">Los comercios de tu barrio, con su catálogo y pedidos directos por WhatsApp.</p>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <Link to="/explorar" className="hover:text-sidebar-accent-foreground">Explorar</Link>
            <Link to="/register" className="hover:text-sidebar-accent-foreground">Sumá tu negocio</Link>
            <Link to="/contact" className="hover:text-sidebar-accent-foreground">Contacto</Link>
            <Link to="/login" className="hover:text-sidebar-accent-foreground">Ingresar</Link>
          </div>
        </div>
      </footer>

      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
      <CartSheet />
    </div>
  );
}
