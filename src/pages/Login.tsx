import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import type { z } from 'zod';
import { loginSchema } from '@shared/schemas';
import type { Session } from '@shared/types';
import { api } from '@/api';
import { GOOGLE_ERRORS, GoogleSignIn } from '@/components/auth/GoogleButton';
import { BrandMark } from '@/components/common/BrandMark';
import { TextField } from '@/components/common/FormFields';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { useAuth } from '@/context/AuthContext';
import { useTitle } from '@/hooks/useTitle';

export default function Login() {
  useTitle('Ingresar');
  const navigate = useNavigate();
  const { user, signIn } = useAuth();
  const [params] = useSearchParams();
  const [error, setError] = useState(() => GOOGLE_ERRORS[params.get('error') ?? ''] ?? '');
  const form = useForm<z.input<typeof loginSchema>, unknown, z.output<typeof loginSchema>>({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } });

  useEffect(() => {
    if (user) navigate('/dashboard', { replace: true });
  }, [user, navigate]);

  const onSubmit = form.handleSubmit(async (values) => {
    setError('');
    try {
      signIn(await api<Session>('/auth/login', { method: 'POST', body: values }));
    } catch (err) {
      setError((err as Error).message);
    }
  });

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <div className="awning" aria-hidden />
      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <BrandMark />
          <h1 className="mt-6 text-3xl font-bold">Hola de nuevo</h1>
          <p className="mt-1 text-muted-foreground">Entrá para administrar tu negocio.</p>

          <div className="mt-6 space-y-4">
            {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
            <GoogleSignIn />
          </div>
          <Form {...form}>
            <form onSubmit={onSubmit} className="mt-4 space-y-4" noValidate>
              <TextField control={form.control} name="email" label="Email" type="email" autoComplete="email" autoFocus />
              <TextField control={form.control} name="password" label="Contraseña" type="password" autoComplete="current-password" />
              <Button type="submit" size="lg" className="w-full" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && <Loader2 className="animate-spin" />} Ingresar
              </Button>
            </form>
          </Form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            ¿Todavía no estás en Detoke? <Link to="/register" className="font-semibold text-primary hover:underline">Sumá tu negocio</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
