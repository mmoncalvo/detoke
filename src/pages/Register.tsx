import { zodResolver } from '@hookform/resolvers/zod';
import { Check, Loader2 } from 'lucide-react';
import { lazy, Suspense, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import type { z } from 'zod';
import { defaultHours, type BusinessHours } from '@shared/business';
import { accountSchema, hoursSchema, newBusinessSchema } from '@shared/schemas';
import type { BusinessCategory, Session } from '@shared/types';
import { api, ApiError } from '@/api';
import { BrandMark } from '@/components/common/BrandMark';
import { SelectField, TextField } from '@/components/common/FormFields';
import { HoursEditor } from '@/components/dashboard/HoursEditor';
import { ImageUpload } from '@/components/dashboard/ImageUpload';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/context/AuthContext';
import { useBusinessSaver } from '@/hooks/useBusinessSaver';
import { useFetch } from '@/hooks/useFetch';
import { useTitle } from '@/hooks/useTitle';
import { toast } from 'sonner';

const LocationPicker = lazy(() => import('@/components/dashboard/LocationPicker'));

const STEPS = [
  { title: 'Tu cuenta', subtitle: 'Con estos datos vas a entrar a tu panel.' },
  { title: 'Tu negocio', subtitle: 'Lo básico para que te encuentren.' },
  { title: 'Ubicación', subtitle: 'Contale al barrio dónde estás.' },
  { title: 'Horarios', subtitle: 'Así los clientes saben si estás abierto.' },
  { title: 'Logo y portada', subtitle: 'Una buena imagen hace la diferencia.' },
];

type Account = z.output<typeof accountSchema>;

function StepActions({ onSkip, busy, submitLabel = 'Continuar' }: { onSkip?: () => void; busy?: boolean; submitLabel?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 pt-2">
      {onSkip ? <Button type="button" variant="ghost" onClick={onSkip}>Lo completo después</Button> : <span />}
      <Button type="submit" size="lg" disabled={busy}>{busy && <Loader2 className="animate-spin" />} {submitLabel}</Button>
    </div>
  );
}

function AccountStep({ initial, emailError, onNext }: { initial?: Account; emailError?: string; onNext: (account: Account) => void }) {
  const form = useForm<z.input<typeof accountSchema>, unknown, Account>({ resolver: zodResolver(accountSchema), defaultValues: initial ?? { name: '', email: '', password: '' } });

  useEffect(() => {
    if (emailError) form.setError('email', { message: emailError });
  }, [emailError, form]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onNext)} className="space-y-4" noValidate>
        <TextField control={form.control} name="name" label="Tu nombre" autoComplete="name" autoFocus />
        <TextField control={form.control} name="email" label="Email" type="email" autoComplete="email" />
        <TextField control={form.control} name="password" label="Contraseña" type="password" autoComplete="new-password" description="Al menos 8 caracteres." />
        <StepActions />
      </form>
    </Form>
  );
}

function BusinessStep({ onBack, onNext }: { onBack: () => void; onNext: (business: z.output<typeof newBusinessSchema>) => Promise<void> }) {
  const categories = useFetch<BusinessCategory[]>('/business-categories');
  const form = useForm<z.input<typeof newBusinessSchema>, unknown, z.output<typeof newBusinessSchema>>({ resolver: zodResolver(newBusinessSchema), defaultValues: { name: '', businessCategoryId: '', whatsapp: '' } });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onNext)} className="space-y-4" noValidate>
        <TextField control={form.control} name="name" label="Nombre del negocio" autoFocus />
        <SelectField control={form.control} name="businessCategoryId" label="Rubro" placeholder="Elegí tu rubro" options={categories.data ?? []} />
        <TextField control={form.control} name="whatsapp" label="WhatsApp del negocio" type="tel" inputMode="tel" placeholder="11 2345 6789" description="Acá te van a llegar los pedidos. Si estás fuera de Argentina, incluí el código de país." />
        <div className="flex items-center justify-between gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onBack}>Volver</Button>
          <Button type="submit" size="lg" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting && <Loader2 className="animate-spin" />} Crear mi negocio</Button>
        </div>
      </form>
    </Form>
  );
}

function LocationStep({ onNext }: { onNext: () => void }) {
  const { save } = useBusinessSaver();
  const [address, setAddress] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('Buenos Aires');
  const [point, setPoint] = useState<{ latitude: number | null; longitude: number | null }>({ latitude: null, longitude: null });
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    if (await save({ address, neighborhood, city, ...point }, '')) onNext();
    setBusy(false);
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-2"><Label htmlFor="address">Dirección</Label><Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Calle y número" autoComplete="street-address" /></div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2"><Label htmlFor="neighborhood">Barrio</Label><Input id="neighborhood" value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} /></div>
        <div className="space-y-2"><Label htmlFor="city">Ciudad</Label><Input id="city" value={city} onChange={(e) => setCity(e.target.value)} /></div>
      </div>
      <Suspense fallback={<Skeleton className="h-64 w-full rounded-xl" />}><LocationPicker value={point} onChange={setPoint} /></Suspense>
      <StepActions onSkip={onNext} busy={busy} />
    </form>
  );
}

function HoursStep({ onNext }: { onNext: () => void }) {
  const { save } = useBusinessSaver();
  const [hours, setHours] = useState<BusinessHours>(defaultHours);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = hoursSchema.safeParse(hours);
    if (!parsed.success) return void toast.error(parsed.error.issues[0]?.message ?? 'Revisá los horarios');
    setBusy(true);
    if (await save({ hours }, '')) onNext();
    setBusy(false);
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <HoursEditor value={hours} onChange={setHours} />
      <StepActions onSkip={onNext} busy={busy} />
    </form>
  );
}

function ImagesStep({ onFinish }: { onFinish: () => void }) {
  const { business } = useAuth();
  const { uploadImage } = useBusinessSaver();
  return (
    <form onSubmit={(e) => { e.preventDefault(); onFinish(); }} className="space-y-5">
      <ImageUpload label="Logo" hint="Cuadrado, se ve mejor con fondo liso." value={business?.logo} className="size-32" onUpload={(file) => uploadImage('logo', file)} />
      <ImageUpload label="Foto de portada" hint="Horizontal: tu local, tus productos o tu equipo." value={business?.coverImage} className="aspect-[16/9] w-full" onUpload={(file) => uploadImage('cover', file)} />
      <StepActions submitLabel="Ir a mi panel" />
    </form>
  );
}

export default function Register() {
  useTitle('Sumá tu negocio');
  const navigate = useNavigate();
  const { user, isLoading, signIn } = useAuth();
  const [step, setStep] = useState(0);
  const [account, setAccount] = useState<Account>();
  const [emailError, setEmailError] = useState<string>();

  // Someone already signed in has nothing to do here, unless this form just created the account.
  useEffect(() => {
    if (!isLoading && user && step < 2) navigate('/dashboard', { replace: true });
  }, [isLoading, user, step, navigate]);

  const createBusiness = async (business: z.output<typeof newBusinessSchema>) => {
    try {
      const session = await api<Session>('/auth/register', { method: 'POST', body: { ...account, business } });
      setStep(2);
      signIn(session);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setEmailError(err.message);
        setStep(0);
      } else {
        toast.error((err as Error).message);
      }
    }
  };

  const finish = () => {
    toast.success('¡Listo! Tu negocio ya está publicado');
    navigate('/dashboard');
  };

  return (
    <div className="flex min-h-svh flex-col">
      <div className="awning" aria-hidden />
      <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
        <div className="flex items-center justify-between">
          <BrandMark />
          <span className="text-sm text-muted-foreground">Paso {step + 1} de {STEPS.length}</span>
        </div>
        <Progress value={((step + 1) / STEPS.length) * 100} className="mt-4" aria-label="Progreso del registro" />

        <ol className="mt-3 hidden justify-between sm:flex" aria-hidden>
          {STEPS.map((s, i) => (
            <li key={s.title} className={`flex items-center gap-1 text-xs font-medium ${i <= step ? 'text-primary' : 'text-muted-foreground'}`}>
              {i < step && <Check className="size-3" />} {s.title}
            </li>
          ))}
        </ol>

        <h1 className="mt-8 text-3xl font-bold">{STEPS[step].title}</h1>
        <p className="mb-6 mt-1 text-muted-foreground">{STEPS[step].subtitle}</p>

        {step === 0 && <AccountStep initial={account} emailError={emailError} onNext={(a) => { setAccount(a); setEmailError(undefined); setStep(1); }} />}
        {step === 1 && <BusinessStep onBack={() => setStep(0)} onNext={createBusiness} />}
        {step === 2 && <LocationStep onNext={() => setStep(3)} />}
        {step === 3 && <HoursStep onNext={() => setStep(4)} />}
        {step === 4 && <ImagesStep onFinish={finish} />}

        {step < 2 && <p className="mt-6 text-center text-sm text-muted-foreground">¿Ya tenés cuenta? <Link to="/login" className="font-semibold text-primary hover:underline">Ingresá</Link></p>}
      </div>
    </div>
  );
}
