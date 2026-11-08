import { ArrowLeftRight, Bike, CalendarClock, ClipboardList, ExternalLink, Images, LayoutDashboard, LifeBuoy, LogOut, Package, Store, Users } from 'lucide-react';
import { lazy, useEffect } from 'react';
import { Link, Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { ImpersonationBanner } from '@/components/layout/ImpersonationBanner';
import { Button } from '@/components/ui/button';
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuBadge, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarRail, SidebarTrigger, useSidebar } from '@/components/ui/sidebar';
import { useAuth } from '@/context/AuthContext';
import { useOrderAlerts } from '@/hooks/useOrderAlerts';

const AdminAccounts = lazy(() => import('@/pages/dashboard/AdminAccounts'));

interface NavEntry {
  to: string;
  label: string;
  icon: typeof Store;
  end?: boolean;
  badge?: number;
}

const SELLER_NAV: NavEntry[] = [
  { to: '/dashboard/orders', label: 'Pedidos', icon: ClipboardList },
  { to: '/dashboard', label: 'Resumen', icon: LayoutDashboard, end: true },
  { to: '/dashboard/products', label: 'Productos', icon: Package },
  { to: '/dashboard/business', label: 'Mi negocio', icon: Store },
  { to: '/dashboard/hours', label: 'Horarios', icon: CalendarClock },
  { to: '/dashboard/gallery', label: 'Galería', icon: Images },
  { to: '/dashboard/delivery', label: 'Entrega y pagos', icon: Bike },
];

const ADMIN_NAV: NavEntry[] = [{ to: '/dashboard', label: 'Cuentas', icon: Users, end: true }];

const isCurrent = (entry: NavEntry, pathname: string) => (entry.end ? pathname === entry.to : pathname.startsWith(entry.to));

function NavItems({ items }: { items: NavEntry[] }) {
  const { pathname } = useLocation();
  const { setOpenMobile } = useSidebar();
  return (
    <SidebarMenu>
      {items.map((entry) => (
        <SidebarMenuItem key={entry.to}>
          <SidebarMenuButton asChild tooltip={entry.label} isActive={isCurrent(entry, pathname)}>
            <NavLink to={entry.to} end={entry.end} onClick={() => setOpenMobile(false)}><entry.icon /> <span>{entry.label}</span></NavLink>
          </SidebarMenuButton>
          {!!entry.badge && <SidebarMenuBadge className="rounded-full bg-mustard px-1.5 text-[11px] font-bold text-[oklch(0.25_0.04_80)] peer-hover/menu-button:text-[oklch(0.25_0.04_80)]" aria-label={`${entry.badge} pedidos nuevos`}>{entry.badge}</SidebarMenuBadge>}
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}

/** Restores the collapsed or expanded state saved by the sidebar in its cookie. */
function savedSidebarOpen() {
  const match = document.cookie.match(/(?:^|; )sidebar_state=(true|false)/);
  return match ? match[1] === 'true' : true;
}

const initials = (name = '') => name.split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]).join('').toUpperCase();

export default function DashboardLayout() {
  const { user, business, impersonatedBy, signOut, stopImpersonation } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'admin';
  const pendingOrders = useOrderAlerts(isAdmin ? null : business?.id, () => navigate('/dashboard/orders'));
  const nav = isAdmin ? ADMIN_NAV : SELLER_NAV.map((entry) => (entry.to === '/dashboard/orders' ? { ...entry, badge: pendingOrders } : entry));
  const title = isAdmin ? 'Panel de administración' : nav.find((entry) => isCurrent(entry, pathname))?.label;

  // The admin panel has a single screen.
  useEffect(() => {
    if (isAdmin && pathname !== '/dashboard') navigate('/dashboard', { replace: true });
  }, [isAdmin, pathname, navigate]);

  const exit = () => {
    signOut();
    navigate('/');
  };

  const backToAdmin = async () => {
    await stopImpersonation();
    navigate('/dashboard');
  };

  // Accounts made with Google start without a business: finish the onboarding first.
  if (!isAdmin && !business) return <Navigate to="/register?step=business" replace />;

  return (
    <SidebarProvider defaultOpen={savedSidebarOpen()}>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild size="lg" tooltip={isAdmin ? 'Detoke · Administración' : 'Detoke · Ver mi página'}>
                <Link to={isAdmin ? '/' : `/negocio/${business?.slug}`} target={isAdmin ? undefined : '_blank'}>
                  <img src="/favicon.svg" alt="" className="aspect-square size-8 shrink-0 rounded-lg" />
                  <span className="grid flex-1 text-left leading-tight">
                    <span className="truncate font-display text-lg font-bold text-sidebar-accent-foreground">Detoke</span>
                    <span className="truncate text-xs">{isAdmin ? 'Administración' : business?.name}</span>
                  </span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup><SidebarGroupContent><NavItems items={nav} /></SidebarGroupContent></SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            {impersonatedBy && (
              <SidebarMenuItem>
                <SidebarMenuButton tooltip="Volver al administrador" onClick={backToAdmin} className="bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90 hover:text-sidebar-primary-foreground">
                  <ArrowLeftRight /> <span>Volver al administrador</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
            {!isAdmin && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Ayuda"><Link to="/contact"><LifeBuoy /> <span>Ayuda</span></Link></SidebarMenuButton>
              </SidebarMenuItem>
            )}
            <SidebarMenuItem>
              <SidebarMenuButton tooltip="Cerrar sesión" onClick={exit}><LogOut /> <span>Cerrar sesión</span></SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" tooltip={user?.email} className="cursor-default hover:bg-transparent active:bg-transparent">
                {user?.avatarUrl
                  ? <img src={user.avatarUrl} alt="" referrerPolicy="no-referrer" className="aspect-square size-8 shrink-0 rounded-lg object-cover" />
                  : <span className="flex aspect-square size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-accent text-xs font-semibold text-sidebar-accent-foreground">{initials(user?.name)}</span>}
                <span className="grid flex-1 text-left text-xs leading-tight">
                  <span className="truncate font-medium text-sidebar-accent-foreground">{user?.name}</span>
                  <span className="truncate">{user?.email}</span>
                </span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
      <SidebarInset>
        <div className="sticky top-0 z-30">
          <ImpersonationBanner />
          <header className="flex h-14 items-center gap-2 border-b bg-background/90 px-4 backdrop-blur">
            <SidebarTrigger />
            <h1 className="truncate font-display text-lg font-semibold">{title}</h1>
            <div className="ml-auto flex items-center gap-1">
              <ThemeToggle />
              {!isAdmin && business && (
                <Button asChild variant="outline" size="sm"><Link to={`/negocio/${business.slug}`} target="_blank"><ExternalLink /> <span className="hidden sm:inline">Ver mi página</span></Link></Button>
              )}
            </div>
          </header>
        </div>
        <div className="mx-auto w-full max-w-panel flex-1 p-4 sm:p-6">{isAdmin ? <AdminAccounts /> : <Outlet />}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
