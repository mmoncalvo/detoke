import { Bike, CalendarClock, ExternalLink, Images, LayoutDashboard, LifeBuoy, LogOut, Package, Store } from 'lucide-react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { BrandMark } from '@/components/common/BrandMark';
import { EmptyState } from '@/components/common/States';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { Button } from '@/components/ui/button';
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger, useSidebar } from '@/components/ui/sidebar';
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
          <SidebarMenuButton asChild isActive={end ? pathname === to : pathname.startsWith(to)}>
            <NavLink to={to} end={end} onClick={() => setOpenMobile(false)}><Icon /> {label}</NavLink>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}

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
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader className="p-4"><BrandMark inverted /></SidebarHeader>
        <SidebarContent>
          <SidebarGroup><SidebarGroupContent><NavItems /></SidebarGroupContent></SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <div className="px-2 text-xs">
            <p className="truncate font-medium text-sidebar-accent-foreground">{business.name}</p>
            <p className="truncate">{user?.email}</p>
          </div>
          <SidebarMenu>
            <SidebarMenuItem><SidebarMenuButton asChild><Link to="/contact"><LifeBuoy /> Ayuda</Link></SidebarMenuButton></SidebarMenuItem>
            <SidebarMenuItem><SidebarMenuButton onClick={exit}><LogOut /> Cerrar sesión</SidebarMenuButton></SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
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
