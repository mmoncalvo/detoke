import { Ban, ChevronLeft, ChevronRight, CircleCheck, ExternalLink, Loader2, LogIn, MoreVertical, Search, Trash2, Users } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import type { AdminAccount, BusinessCategory, Page } from '@shared/types';
import { api } from '@/api';
import { SafeImage } from '@/components/common/SafeImage';
import { EmptyState, ErrorState } from '@/components/common/States';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/context/AuthContext';
import { useFetch } from '@/hooks/useFetch';
import { useTitle } from '@/hooks/useTitle';
import { useUrlState } from '@/hooks/useUrlState';

const ALL = 'all';
const PAGE_SIZE = 20;

function useDebounced<T>(value: T, ms = 250) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);
  return debounced;
}

/** Search box that jumps straight to an account. */
function QuickSwitch({ onPick }: { onPick: (account: AdminAccount) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const term = useDebounced(query);
  const { data } = useFetch<Page<AdminAccount>>(open ? `/admin/users?limit=8&search=${encodeURIComponent(term)}` : null);
  // Results arrive after typing: keep the first one highlighted so Enter picks it.
  const [highlighted, setHighlighted] = useState('');
  useEffect(() => setHighlighted(data?.items[0]?.user.id ?? ''), [data]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-start bg-card text-muted-foreground sm:w-80">
          <Search /> Buscar una cuenta para entrar
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-72 p-0" align="start">
        <Command shouldFilter={false} value={highlighted} onValueChange={setHighlighted}>
          <CommandInput placeholder="Negocio, nombre o email" value={query} onValueChange={setQuery} />
          <CommandList>
            <CommandEmpty>No hay cuentas con esa búsqueda.</CommandEmpty>
            {data && data.items.length > 0 && (
              <CommandGroup>
                {data.items.map((account) => (
                  <CommandItem key={account.user.id} value={account.user.id} onSelect={() => { setOpen(false); onPick(account); }}>
                    <SafeImage src={account.business?.logo} alt="" className="size-7 shrink-0 rounded-md" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{account.business?.name ?? account.user.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">{account.user.email}</span>
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export default function AdminAccounts() {
  useTitle('Panel de administración');
  const navigate = useNavigate();
  const { startImpersonation } = useAuth();
  const categories = useFetch<BusinessCategory[]>('/business-categories');
  const [search, setSearch] = useUrlState('q', '');
  const [category, setCategory] = useUrlState('category', ALL);
  const [status, setStatus] = useUrlState('status', ALL);
  const [pageParam, setPageParam] = useUrlState('page', '1');
  const page = Math.max(1, Number(pageParam) || 1);
  const setPage = (next: number | ((current: number) => number)) => setPageParam(String(typeof next === 'function' ? next(page) : next));
  const [picked, setPicked] = useState<AdminAccount | null>(null);
  const [entering, setEntering] = useState(false);
  const term = useDebounced(search);

  // A new filter starts from the first page (not on the first render, which may come with ?page=).
  const filters = `${term}|${category}|${status}`;
  const previousFilters = useRef(filters);
  useEffect(() => {
    if (previousFilters.current !== filters) setPage(1);
    previousFilters.current = filters;
  }, [filters]); // eslint-disable-line react-hooks/exhaustive-deps

  const query = useMemo(() => {
    const q = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
    if (term) q.set('search', term);
    if (category !== ALL) q.set('category', category);
    if (status !== ALL) q.set('status', status);
    return q.toString();
  }, [term, category, status, page]);
  const { data, error, loading, reload } = useFetch<Page<AdminAccount>>(`/admin/users?${query}`);

  const [toDisable, setToDisable] = useState<AdminAccount | null>(null);
  const [toDelete, setToDelete] = useState<AdminAccount | null>(null);
  const [reason, setReason] = useState('');
  const [confirmName, setConfirmName] = useState('');
  const [working, setWorking] = useState(false);

  /** Disables (with an optional reason) or enables a business. */
  const changeStatus = async (account: AdminAccount, disabled: boolean) => {
    if (!account.business) return;
    setWorking(true);
    try {
      await api(`/admin/businesses/${account.business.id}/status`, { method: 'PATCH', body: { disabled, reason: disabled ? reason : null } });
      toast.success(disabled ? `${account.business.name} quedó deshabilitado` : `${account.business.name} vuelve a estar visible`);
      setToDisable(null);
      reload();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setWorking(false);
    }
  };

  const remove = async () => {
    if (!toDelete?.business) return;
    setWorking(true);
    try {
      await api(`/admin/businesses/${toDelete.business.id}`, { method: 'DELETE' });
      toast.success(`Eliminamos ${toDelete.business.name} y su cuenta`);
      setToDelete(null);
      reload();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setWorking(false);
    }
  };

  const enter = async () => {
    if (!picked) return;
    setEntering(true);
    try {
      await startImpersonation(picked.user.id);
      toast.success(`Ahora estás navegando como ${picked.user.name}`);
      navigate('/dashboard');
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setEntering(false);
      setPicked(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h2 className="text-2xl font-bold">Cuentas</h2>
          <p className="text-muted-foreground">Elegí una cuenta para navegar el sistema en su nombre.</p>
        </div>
        <QuickSwitch onPick={setPicked} />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Filtrar por negocio, nombre o email" className="bg-card pl-9" aria-label="Filtrar cuentas" />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-full bg-card sm:w-48" aria-label="Filtrar por rubro"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos los rubros</SelectItem>
            {(categories.data ?? []).map((c) => <SelectItem key={c.id} value={c.slug}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-full bg-card sm:w-48" aria-label="Filtrar por estado"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos los estados</SelectItem>
            <SelectItem value="active">Publicados</SelectItem>
            <SelectItem value="inactive">Deshabilitados</SelectItem>
            <SelectItem value="incomplete">Perfil incompleto</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {error ? <ErrorState message={error} onRetry={reload} /> : loading && !data ? <Skeleton className="h-96 w-full rounded-xl" /> : data && data.items.length === 0 ? (
        <EmptyState icon={Users} title="No hay cuentas con esos filtros" />
      ) : data && (
        <>
          <div className="overflow-hidden rounded-xl border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Negocio</TableHead>
                  <TableHead className="hidden md:table-cell">Responsable</TableHead>
                  <TableHead className="hidden lg:table-cell">Rubro</TableHead>
                  <TableHead className="hidden text-right sm:table-cell">Productos</TableHead>
                  <TableHead className="hidden sm:table-cell">Perfil</TableHead>
                  <TableHead><span className="sr-only">Acciones</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((account) => (
                  <TableRow key={account.user.id}>
                    <TableCell>
                      <div className="flex min-w-0 items-center gap-3">
                        <SafeImage src={account.business?.logo} alt="" className="size-10 shrink-0 rounded-md" />
                        <div className="min-w-0">
                          <p className="max-w-40 truncate font-medium sm:max-w-56">{account.business?.name ?? 'Sin negocio'}</p>
                          <p className="max-w-40 truncate text-xs text-muted-foreground sm:max-w-56">{account.user.email}</p>
                        </div>
                        {account.business && !account.business.isActive && <Badge variant="danger">Deshabilitado</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{account.user.name}</TableCell>
                    <TableCell className="hidden text-muted-foreground lg:table-cell">{account.business?.category?.name ?? '—'}</TableCell>
                    <TableCell className="hidden text-right tabular-nums sm:table-cell">{account.productCount}</TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {account.profile.complete ? <Badge variant="success">Completo</Badge> : <Badge variant="warning">{account.profile.done} de {account.profile.total}</Badge>}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="sm" variant="outline" onClick={() => setPicked(account)} aria-label={`Entrar como ${account.user.name}`}>
                          <LogIn /> <span className="hidden sm:inline">Entrar como</span>
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost" className="size-8" aria-label={`Más opciones de ${account.business?.name ?? account.user.name}`}><MoreVertical className="size-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="min-w-48">
                            <DropdownMenuItem onSelect={() => setPicked(account)}><LogIn /> Entrar como</DropdownMenuItem>
                            {account.business?.isActive && (
                              <DropdownMenuItem asChild><Link to={`/negocio/${account.business.slug}`}><ExternalLink /> Ver página</Link></DropdownMenuItem>
                            )}
                            {account.business && (
                              <>
                                {account.business.isActive
                                  ? <DropdownMenuItem onSelect={() => { setReason(''); setToDisable(account); }}><Ban /> Deshabilitar</DropdownMenuItem>
                                  : <DropdownMenuItem onSelect={() => void changeStatus(account, false)}><CircleCheck /> Habilitar</DropdownMenuItem>}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem variant="destructive" onSelect={() => { setConfirmName(''); setToDelete(account); }}><Trash2 /> Eliminar</DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{data.total} {data.total === 1 ? 'cuenta' : 'cuentas'}</span>
            <div className="flex items-center gap-2">
              <span>Página {data.page} de {data.pages}</span>
              <Button variant="outline" size="icon" className="size-8" aria-label="Página anterior" disabled={data.page <= 1} onClick={() => setPage((p) => p - 1)}><ChevronLeft className="size-4" /></Button>
              <Button variant="outline" size="icon" className="size-8" aria-label="Página siguiente" disabled={data.page >= data.pages} onClick={() => setPage((p) => p + 1)}><ChevronRight className="size-4" /></Button>
            </div>
          </div>
        </>
      )}

      <AlertDialog open={!!picked} onOpenChange={(open) => !open && !entering && setPicked(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Entrar como {picked?.user.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Vas a ver y poder editar todo {picked?.business ? <>lo de <strong>{picked.business.name}</strong></> : 'lo de esta cuenta'} en su nombre: negocio, productos, horarios y galería. La sesión dura 2 horas y queda registrada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={entering}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); void enter(); }} disabled={entering}>
              {entering && <Loader2 className="animate-spin" />} Entrar como {picked?.user.name.split(' ')[0]}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!toDisable} onOpenChange={(open) => !open && !working && setToDisable(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Deshabilitar {toDisable?.business?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Su página, sus productos y sus datos dejan de aparecer en Detoke y no puede recibir pedidos. El dueño puede seguir entrando a su panel y ve un aviso. Lo podés volver a habilitar cuando quieras.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor="disable-reason">Motivo (opcional, lo ve el dueño)</Label>
            <Textarea id="disable-reason" rows={2} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Por ejemplo: datos de contacto incorrectos" />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={working}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); if (toDisable) void changeStatus(toDisable, true); }} disabled={working}>
              {working && <Loader2 className="animate-spin" />} Deshabilitar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!toDelete} onOpenChange={(open) => !open && !working && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar {toDelete?.business?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Se borran para siempre la cuenta de {toDelete?.user.email}, el negocio, sus productos, sus pedidos y sus imágenes. <strong>No se puede deshacer.</strong> Si solo querés ocultarlo, deshabilitalo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor="delete-confirm">Escribí <strong>{toDelete?.business?.name}</strong> para confirmar</Label>
            <Input id="delete-confirm" autoComplete="off" value={confirmName} onChange={(e) => setConfirmName(e.target.value)} />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={working}>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-white hover:bg-destructive/90" onClick={(e) => { e.preventDefault(); void remove(); }} disabled={working || confirmName.trim() !== toDelete?.business?.name}>
              {working && <Loader2 className="animate-spin" />} Eliminar para siempre
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
