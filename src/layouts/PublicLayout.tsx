import { LayoutDashboard, Search, ShoppingBag } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { BrandMark } from '@/components/common/BrandMark';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { CartSheet } from '@/components/layout/CartSheet';
import { SearchDialog } from '@/components/layout/SearchDialog';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';

export default function PublicLayout() {
  const { user } = useAuth();
  const { count, setOpen } = useCart();
  const [searchOpen, setSearchOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => window.scrollTo(0, 0), [pathname]);

  return (
    <div className="flex min-h-svh flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-2 focus:rounded-md focus:bg-card focus:px-3 focus:py-2">Saltar al contenido</a>
      <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-4">
          <BrandMark />
          <nav className="ml-4 hidden md:block" aria-label="Principal">
            <NavLink to="/explorar" className={({ isActive }) => `rounded-md px-3 py-2 text-sm font-medium hover:bg-secondary ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>Explorar</NavLink>
          </nav>

          <button
            onClick={() => setSearchOpen(true)}
            className="ml-auto hidden h-10 w-72 items-center gap-2 rounded-lg border bg-card px-3 text-sm text-muted-foreground transition-colors hover:border-primary/40 md:flex"
          >
            <Search className="size-4" />
            <span className="flex-1 text-left">Buscar en el barrio</span>
            <kbd className="rounded bg-secondary px-1.5 py-0.5 text-[10px] font-medium">⌘K</kbd>
          </button>

          <div className="ml-auto flex items-center gap-1 md:ml-2">
            <Button variant="ghost" size="icon" className="md:hidden" aria-label="Buscar" onClick={() => setSearchOpen(true)}><Search className="size-5" /></Button>
            <ThemeToggle />
            <Button variant="ghost" size="icon" className="relative" aria-label={`Ver pedido, ${count} productos`} onClick={() => setOpen(true)}>
              <ShoppingBag className="size-5" />
              {count > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-tomato px-1 text-[11px] font-bold text-white">{count}</span>}
            </Button>
            {user ? (
              <Button asChild variant="outline" className="ml-1">
                <Link to="/dashboard"><LayoutDashboard /> <span className="hidden sm:inline">Mi panel</span></Link>
              </Button>
            ) : (
              <Button asChild variant="outline" className="ml-1"><Link to="/login">Ingresar</Link></Button>
            )}
          </div>
        </div>
      </header>

      <main id="main" className="flex-1"><Outlet /></main>

      <footer className="mt-16 bg-sidebar text-sidebar-foreground">
        <div className="awning" aria-hidden />
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-10 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <BrandMark inverted />
            <p className="mt-2 max-w-sm text-sm">Los comercios de tu barrio, con su catálogo y pedidos directos por WhatsApp.</p>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <Link to="/explorar" className="hover:text-sidebar-accent-foreground">Explorar</Link>
            <Link to="/register" className="hover:text-sidebar-accent-foreground">Sumá tu negocio</Link>
            <Link to="/login" className="hover:text-sidebar-accent-foreground">Ingresar</Link>
          </div>
        </div>
      </footer>

      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
      <CartSheet />
    </div>
  );
}
