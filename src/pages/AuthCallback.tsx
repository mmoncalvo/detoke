import { Loader2 } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { hasHours } from '@shared/business';
import type { Session } from '@shared/types';
import { api } from '@/api';
import { useAuth } from '@/context/AuthContext';
import { useTitle } from '@/hooks/useTitle';

/** Where the Google sign-in comes back: trades the one-time code for a session. */
export default function AuthCallback() {
  useTitle('Ingresando');
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const code = params.get('code');
    if (!code) {
      navigate(`/login?error=${params.get('error') ?? 'failed'}`, { replace: true });
      return;
    }

    api<Session>('/auth/google/exchange', { method: 'POST', body: { code } })
      .then((session) => {
        signIn(session);
        const { business, user } = session;
        if (user.role === 'customer') navigate('/', { replace: true });
        else if (!business) navigate('/register?step=business', { replace: true });
        else if (!business.address && !hasHours(business.hours)) navigate('/register?step=location', { replace: true });
        else navigate('/dashboard', { replace: true });
      })
      .catch(() => navigate('/login?error=invalid_state', { replace: true }));
  }, [params, navigate, signIn]);

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-3 text-muted-foreground" role="status">
      <Loader2 className="size-7 animate-spin" />
      Ingresando con Google…
    </div>
  );
}
