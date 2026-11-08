import { Camera, KeyRound, Loader2, LogOut, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import type { User } from '@shared/types';
import { api } from '@/api';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { UserAvatar } from '@/components/common/UserAvatar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { canNotify, readSoundPreference, saveSoundPreference } from '@/hooks/useOrderAlerts';
import { useTitle } from '@/hooks/useTitle';

const MAX_IMAGE_MB = 5;

function Field({ id, label, error, hint, children }: { id: string; label: string; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? <p id={`${id}-error`} className="text-sm text-destructive">{error}</p> : hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function ProfileCard() {
  const { user, setUser, impersonatedBy } = useAuth();
  const [form, setForm] = useState({ name: user?.name ?? '', email: user?.email ?? '', phone: user?.phone ?? '' });
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const changed = !!user && (form.name !== user.name || form.email !== user.email || form.phone !== (user.phone ?? ''));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      setUser(await api<User>('/auth/me', { method: 'PATCH', body: { ...form, phone: form.phone || null } }));
      toast.success('Guardamos tus datos');
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const upload = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_IMAGE_MB * 1024 * 1024) return toast.error(`La imagen puede pesar hasta ${MAX_IMAGE_MB} MB`);
    setUploading(true);
    try {
      const body = new FormData();
      body.append('image', file);
      setUser(await api<User>('/auth/me/avatar', { method: 'POST', body }));
      toast.success('Actualizamos tu foto');
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  const removePicture = async () => {
    setUploading(true);
    try {
      setUser(await api<User>('/auth/me/avatar', { method: 'DELETE' }));
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-lg">Perfil</CardTitle>
        <CardDescription>Así te ven en el panel.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="relative shrink-0">
            <UserAvatar name={user?.name} src={user?.avatarUrl} className="size-20 bg-secondary text-xl text-secondary-foreground" />
            {uploading && <span className="absolute inset-0 flex items-center justify-center rounded-full bg-background/70"><Loader2 className="size-5 animate-spin" /></span>}
          </div>
          <div className="flex flex-wrap gap-2">
            <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" id="avatar" onChange={(e) => upload(e.target.files?.[0])} />
            <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => fileInput.current?.click()}><Camera /> {user?.avatarUrl ? 'Cambiar foto' : 'Subir foto'}</Button>
            {user?.avatarUrl && <Button type="button" variant="ghost" size="sm" disabled={uploading} onClick={removePicture}><Trash2 /> Quitar</Button>}
            <p className="w-full text-xs text-muted-foreground">JPG, PNG o WEBP. La recortamos cuadrada desde el centro.</p>
          </div>
        </div>

        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <Field id="account-name" label="Nombre">
            <Input id="account-name" autoComplete="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </Field>
          <Field id="account-phone" label="Teléfono (opcional)">
            <Input id="account-phone" type="tel" autoComplete="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </Field>
          <div className="sm:col-span-2">
            <Field id="account-email" label="Email" hint={impersonatedBy ? 'El email lo puede cambiar solo el dueño de la cuenta.' : 'Con este email ingresás a Detoke.'}>
              <Input id="account-email" type="email" autoComplete="email" value={form.email} disabled={!!impersonatedBy} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={!changed || busy}>{busy && <Loader2 className="animate-spin" />} Guardar cambios</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function SecurityCard() {
  const { impersonatedBy } = useAuth();
  const [security, setSecurity] = useState<{ hasPassword: boolean; hasGoogle: boolean } | null>(null);
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ hasPassword: boolean; hasGoogle: boolean }>('/auth/me/security').then(setSecurity).catch(() => setSecurity({ hasPassword: true, hasGoogle: false }));
  }, []);

  const mismatch = !!form.confirmPassword && form.newPassword !== form.confirmPassword;
  const tooShort = !!form.newPassword && form.newPassword.length < 8;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mismatch || tooShort) return;
    setBusy(true);
    setError(null);
    try {
      await api('/auth/me/password', { method: 'POST', body: security?.hasPassword ? form : { newPassword: form.newPassword, confirmPassword: form.confirmPassword } });
      toast.success(security?.hasPassword ? 'Cambiamos tu contraseña' : 'Listo, ya podés ingresar también con tu contraseña');
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setSecurity((s) => (s ? { ...s, hasPassword: true } : s));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const creating = security && !security.hasPassword;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-lg">Seguridad</CardTitle>
        <CardDescription>
          {creating ? 'Ingresás con Google. Si querés, creá una contraseña para entrar también con tu email.' : security?.hasGoogle ? 'Podés ingresar con Google o con tu email y contraseña.' : 'Cambiá la contraseña con la que ingresás.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {impersonatedBy ? (
          <Alert><KeyRound /><AlertDescription>La contraseña la puede cambiar solo el dueño de la cuenta, aunque estés navegando en su nombre.</AlertDescription></Alert>
        ) : !security ? (
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        ) : (
          <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
            {security.hasPassword && (
              <div className="sm:col-span-2 sm:max-w-[calc(50%-0.5rem)]">
                <Field id="current-password" label="Contraseña actual">
                  <Input id="current-password" type="password" autoComplete="current-password" value={form.currentPassword} onChange={(e) => setForm({ ...form, currentPassword: e.target.value })} required />
                </Field>
              </div>
            )}
            <Field id="new-password" label={creating ? 'Contraseña' : 'Contraseña nueva'} error={tooShort ? 'Usá al menos 8 caracteres' : undefined} hint="Al menos 8 caracteres.">
              <Input id="new-password" type="password" autoComplete="new-password" value={form.newPassword} aria-invalid={tooShort} onChange={(e) => setForm({ ...form, newPassword: e.target.value })} required />
            </Field>
            <Field id="confirm-password" label="Repetila" error={mismatch ? 'Las contraseñas no coinciden' : undefined}>
              <Input id="confirm-password" type="password" autoComplete="new-password" value={form.confirmPassword} aria-invalid={mismatch} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} required />
            </Field>
            {error && <p role="alert" className="text-sm text-destructive sm:col-span-2">{error}</p>}
            <div className="sm:col-span-2">
              <Button type="submit" disabled={busy || mismatch || tooShort}>{busy && <Loader2 className="animate-spin" />} {creating ? 'Crear contraseña' : 'Cambiar contraseña'}</Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

function PreferencesCard() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [sound, setSound] = useState(readSoundPreference);
  const [permission, setPermission] = useState<NotificationPermission>(() => (canNotify() ? Notification.permission : 'denied'));
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-lg">Preferencias</CardTitle>
        <CardDescription>Se guardan en este dispositivo.</CardDescription>
      </CardHeader>
      <CardContent className="divide-y">
        <div className="flex items-center justify-between gap-4 pb-4">
          <div>
            <p className="text-sm font-medium">Tema</p>
            <p className="text-sm text-muted-foreground">Modo {theme === 'dark' ? 'oscuro' : 'claro'}</p>
          </div>
          <ThemeToggle className="border" />
        </div>
        {user?.role !== 'admin' && (
          <div className="flex items-center justify-between gap-4 pt-4">
            <Label htmlFor="order-sound" className="block cursor-pointer">
              <span className="block text-sm font-medium">Sonido de pedidos nuevos</span>
              <span className="block text-sm font-normal text-muted-foreground">Suena cuando entra un pedido mientras tenés el panel abierto.</span>
            </Label>
            <Switch id="order-sound" checked={sound} onCheckedChange={(on) => { saveSoundPreference(on); setSound(on); }} />
          </div>
        )}
        {user?.role !== 'admin' && canNotify() && (
          <div className="flex items-center justify-between gap-4 pt-4">
            <div>
              <p className="text-sm font-medium">Avisos del navegador</p>
              <p className="text-sm text-muted-foreground">
                {permission === 'granted' ? 'Activados: te avisamos de pedidos nuevos aunque Detoke esté en otra pestaña.' : permission === 'denied' ? 'Están bloqueados. Podés habilitarlos desde la configuración del navegador para este sitio.' : 'Para enterarte de pedidos nuevos aunque Detoke esté en otra pestaña.'}
              </p>
            </div>
            {permission === 'default' && <Button type="button" variant="outline" size="sm" onClick={() => void Notification.requestPermission().then(setPermission)}>Activar</Button>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function Account() {
  useTitle('Mi cuenta');
  const { signOut } = useAuth();
  const navigate = useNavigate();
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <ProfileCard />
      <SecurityCard />
      <PreferencesCard />
      <div className="flex justify-end">
        <Button variant="ghost" className="text-muted-foreground" onClick={() => { signOut(); navigate('/'); }}><LogOut /> Cerrar sesión</Button>
      </div>
    </div>
  );
}
