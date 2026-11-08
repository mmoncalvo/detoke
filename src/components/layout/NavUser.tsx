import { ArrowLeftRight, Bell, ChevronsUpDown, LifeBuoy, LogOut, Store, UserRound } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { initials } from '@/components/common/UserAvatar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from '@/components/ui/sidebar';
import { useAuth } from '@/context/AuthContext';
import { readSoundPreference, saveSoundPreference } from '@/hooks/useOrderAlerts';

function UserBadge({ name, email, avatarUrl, onPopover = false }: { name?: string; email?: string; avatarUrl?: string | null; onPopover?: boolean }) {
  return (
    <>
      <Avatar className="size-8 rounded-lg">
        {avatarUrl && <AvatarImage src={avatarUrl} alt="" referrerPolicy="no-referrer" className="object-cover" />}
        <AvatarFallback className={`rounded-lg text-xs font-semibold ${onPopover ? 'bg-muted text-foreground' : 'bg-sidebar-accent text-sidebar-accent-foreground'}`}>{initials(name)}</AvatarFallback>
      </Avatar>
      <span className="grid flex-1 text-left text-sm leading-tight">
        <span className="truncate font-medium">{name}</span>
        <span className="truncate text-xs opacity-75">{email}</span>
      </span>
    </>
  );
}

/** The signed-in user at the bottom of the sidebar, with the account menu (shadcn's NavUser block). Faint on purpose. */
export function NavUser({ onBackToAdmin }: { onBackToAdmin: () => void }) {
  const { user, business, impersonatedBy, signOut } = useAuth();
  const { isMobile, setOpenMobile } = useSidebar();
  const navigate = useNavigate();
  const [sound, setSound] = useState(readSoundPreference);
  const isSeller = user?.role !== 'admin';
  const close = () => setOpenMobile(false);

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              tooltip={`${user?.name ?? ''} · Mi cuenta`}
              className="text-sidebar-foreground/75 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <UserBadge name={user?.name} email={user?.email} avatarUrl={user?.avatarUrl} />
              <ChevronsUpDown className="ml-auto size-4 opacity-60" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="min-w-56 rounded-lg" side={isMobile ? 'bottom' : 'right'} align="end" sideOffset={4}>
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <UserBadge name={user?.name} email={user?.email} avatarUrl={user?.avatarUrl} onPopover />
              </div>
              {impersonatedBy && <p className="px-1 pb-1.5 text-xs text-muted-foreground">Navegando como este usuario ({impersonatedBy.name})</p>}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem asChild>
                <Link to="/dashboard/account" onClick={close}><UserRound /> Mi cuenta</Link>
              </DropdownMenuItem>
              {isSeller && business && (
                <DropdownMenuItem asChild>
                  <Link to={`/negocio/${business.slug}`} onClick={close}><Store /> Ver mi negocio</Link>
                </DropdownMenuItem>
              )}
              {isSeller && (
                <DropdownMenuCheckboxItem checked={sound} onCheckedChange={(on) => { saveSoundPreference(on); setSound(on); }} onSelect={(e) => e.preventDefault()}>
                  <Bell /> Sonido de pedidos
                </DropdownMenuCheckboxItem>
              )}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem asChild>
                <Link to="/contact" onClick={close}><LifeBuoy /> Ayuda</Link>
              </DropdownMenuItem>
              {impersonatedBy && (
                <DropdownMenuItem onSelect={onBackToAdmin}><ArrowLeftRight /> Volver a mi cuenta</DropdownMenuItem>
              )}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => { signOut(); navigate('/'); }}><LogOut /> Cerrar sesión</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
