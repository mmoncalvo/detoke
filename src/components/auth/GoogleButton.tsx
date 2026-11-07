import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/api';
import { Button } from '@/components/ui/button';
import { useFetch } from '@/hooks/useFetch';

/** Google's multicolor "G", as required by its branding guidelines. */
function GoogleLogo() {
  return (
    <svg viewBox="0 0 48 48" className="size-[18px]" aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

/** "Continuar con Google" plus an "o" divider. Renders nothing when Google is not configured. */
export function GoogleSignIn({ label = 'Continuar con Google' }: { label?: string }) {
  const { data } = useFetch<{ google: boolean }>('/auth/providers');
  const [busy, setBusy] = useState(false);
  if (!data?.google) return null;

  const start = async () => {
    setBusy(true);
    try {
      const { url } = await api<{ url: string }>('/auth/google/url');
      window.location.assign(url);
    } catch (err) {
      toast.error((err as Error).message);
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <Button
        type="button"
        variant="outline"
        size="lg"
        className="w-full border-[#747775] bg-white font-medium text-[#1F1F1F] hover:bg-[#F7F8F8] hover:text-[#1F1F1F] dark:border-[#8E918F] dark:bg-[#131314] dark:text-[#E3E3E3] dark:hover:bg-[#1F1F20]"
        onClick={start}
        disabled={busy}
      >
        {busy ? <Loader2 className="animate-spin" /> : <GoogleLogo />} {label}
      </Button>
      <div className="flex items-center gap-3 text-xs uppercase text-muted-foreground" aria-hidden>
        <span className="h-px flex-1 bg-border" /> o <span className="h-px flex-1 bg-border" />
      </div>
    </div>
  );
}

/** Messages for the ?error= the Google callback sends back. */
// eslint-disable-next-line react-refresh/only-export-components
export const GOOGLE_ERRORS: Record<string, string> = {
  cancelled: 'Cancelaste el ingreso con Google.',
  unverified: 'Tu email de Google no está verificado. Verificalo en Google o registrate con email y contraseña.',
  admin: 'Las cuentas de administración ingresan con email y contraseña.',
  invalid_state: 'El ingreso con Google venció. Probá de nuevo.',
  failed: 'No pudimos ingresar con Google. Probá de nuevo.',
};
