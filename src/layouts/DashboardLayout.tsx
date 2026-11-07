import { Bike, CalendarClock, ExternalLink, Images, LayoutDashboard, LifeBuoy, LogOut, Package, Store } from 'lucide-react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { EmptyState } from '@/components/common/States';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { Button } from '@/components/ui/button';
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarRail, SidebarTrigger, useSidebar } from '@/components/ui/sidebar';
import { useAuth } from '@/context/AuthContext';

const NAV = [
  { to: '/dashboard', label: 'Resumen', icon: LayoutDashboard, end: true },
  { to: '/dashboard/products', label: 'Productos', icon: Package },
  { to: '/dashboard/business', label: 'Mi negocio', icon: Store },
  { to: '/dashboard/hours', label: 'Horarios', icon: CalendarClock },
  { to: '/dashboard/gallery', label: 'Galería', icon: Images },
  { to: '/dashboard/delivery', label: 'Entrega y pagos', icon: Bike },
];

function NavItems() {
  const { pathname } = useLocation();
  const { setOpenMobile } = useSidebar();
  return (
    <SidebarMenu>
      {NAV.map(({ to, label, icon: Icon, end }) => (
        <SidebarMenuItem key={to}>
          <SidebarMenuButton asChild tooltip={label} isActive={end ? pathname === to : pathname.startsWith(to)}>
            <NavLink to={to} end={end} onClick={() => setOpenMobile(false)}><Icon /> <span>{label}</span></NavLink>
          </SidebarMenuButton>
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
  const { user, business, signOut } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const current = NAV.find((n) => (n.end ? pathname === n.to : pathname.startsWith(n.to)));

  const exit = () => {
    signOut();
    navigate('/');
  };

  if (!business) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20">
        <EmptyState icon={Store} title="Esta cuenta no tiene un negocio" description="Las cuentas de administración no tienen panel de vendedor." action={<Button variant="outline" onClick={exit}>Cerrar sesión</Button>} />
      </div>
    );
  }

  return (
    <SidebarProvider defaultOpen={savedSidebarOpen()}>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild size="lg" tooltip="Detoke · Ver mi página">
                <Link to={`/negocio/${business.slug}`} target="_blank">
                  <img src="/favicon.svg" alt="" className="aspect-square size-8 shrink-0 rounded-lg" />
                  <span className="grid flex-1 text-left leading-tight">
                    <span className="truncate font-display text-lg font-bold text-sidebar-accent-foreground">Detoke</span>
                    <span className="truncate text-xs">{business.name}</span>
                  </span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup><SidebarGroupContent><NavItems /></SidebarGroupContent></SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Ayuda"><Link to="/contact"><LifeBuoy /> <span>Ayuda</span></Link></SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton tooltip="Cerrar sesión" onClick={exit}><LogOut /> <span>Cerrar sesión</span></SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" tooltip={user?.email} className="cursor-default hover:bg-transparent active:bg-transparent">
                <span className="flex aspect-square size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-accent text-xs font-semibold text-sidebar-accent-foreground">{initials(user?.name)}</span>
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
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/90 px-4 backdrop-blur">
          <SidebarTrigger />
          <h1 className="truncate font-display text-lg font-semibold">{current?.label}</h1>
          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
            <Button asChild variant="outline" size="sm"><Link to={`/negocio/${business.slug}`} target="_blank"><ExternalLink /> <span className="hidden sm:inline">Ver mi página</span></Link></Button>
          </div>
        </header>
        <div className="mx-auto w-full max-w-panel flex-1 p-4 sm:p-6"><Outlet /></div>
      </SidebarInset>
    </SidebarProvider>
  );
}
