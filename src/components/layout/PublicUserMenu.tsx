import { LayoutDashboard, LogOut, ReceiptText, Store, UserRound } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { initials } from '@/components/common/UserAvatar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useAuth } from '@/context/AuthContext';
import { usePendingOrders } from '@/context/OrderAlertsContext';

/**
 * The signed-in user in the public navbar. Everyone buys, so "Mis pedidos" (purchases) is always there;
 * owners also get "Mi panel", where "Pedidos" are the ones their business receives.
 */
export function PublicUserMenu() {
  const { user, business, signOut } = useAuth();
  const pending = usePendingOrders();
  const navigate = useNavigate();
  if (!user) return null;
  const isAdmin = user.role === 'admin';
  const hasPanel = isAdmin || !!business || user.role === 'seller';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="relative ml-1 flex items-center rounded-full outline-none transition-opacity hover:opacity-85 focus-visible:ring-2 focus-visible:ring-ring/40" aria-label={pending ? `Tu cuenta, ${pending} pedidos nuevos en tu negocio` : 'Tu cuenta'}>
          <Avatar className="size-9 sm:size-10">
            {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt="" referrerPolicy="no-referrer" className="object-cover" />}
            <AvatarFallback className="bg-secondary text-xs font-semibold">{initials(user.name)}</AvatarFallback>
          </Avatar>
          {pending > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-mustard px-1 text-[11px] font-bold text-[oklch(0.25_0.04_80)]">{pending}</span>}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-56 rounded-lg">
        <DropdownMenuLabel className="font-normal">
          <p className="truncate text-sm font-medium">{user.name}</p>
          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {hasPanel && (
            <DropdownMenuItem asChild>
              <Link to={pending ? '/dashboard/orders' : '/dashboard'}>
                <LayoutDashboard /> Mi panel
                {pending > 0 && <span className="ml-auto rounded-full bg-mustard px-1.5 text-[11px] font-bold text-[oklch(0.25_0.04_80)]">{pending}</span>}
              </Link>
            </DropdownMenuItem>
          )}
          {!isAdmin && <DropdownMenuItem asChild><Link to="/mis-pedidos"><ReceiptText /> Mis pedidos</Link></DropdownMenuItem>}
          <DropdownMenuItem asChild><Link to={user.role === 'customer' ? '/mi-cuenta' : '/dashboard/account'}><UserRound /> Mi cuenta</Link></DropdownMenuItem>
          {user.role === 'customer' && <DropdownMenuItem asChild><Link to="/register?type=business"><Store /> Sumar mi negocio</Link></DropdownMenuItem>}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => { signOut(); navigate('/'); }}><LogOut /> Cerrar sesión</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
