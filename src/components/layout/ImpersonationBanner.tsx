import { Loader2, UserRoundCog } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';

/** Always-visible notice while an admin is acting on behalf of someone else. */
export function ImpersonationBanner() {
  const { user, business, impersonatedBy, stopImpersonation } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  if (!impersonatedBy || !user) return null;

  const back = async () => {
    setBusy(true);
    await stopImpersonation();
    setBusy(false);
    navigate('/dashboard');
  };

  return (
    <div role="status" className="bg-mustard text-[oklch(0.25_0.04_80)]">
      <div className="mx-auto flex max-w-page flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-2 text-sm">
        <UserRoundCog className="size-4 shrink-0" aria-hidden />
        <p className="min-w-0 flex-1">
          Estás navegando como <strong>{user.name}</strong>{business && <> ({business.name})</>}. Los cambios se guardan en su cuenta.
        </p>
        <Button size="sm" variant="outline" className="h-8 border-current/30 bg-white/70 text-inherit hover:bg-white" onClick={back} disabled={busy}>
          {busy && <Loader2 className="animate-spin" />} Volver a mi cuenta
        </Button>
      </div>
    </div>
  );
}
