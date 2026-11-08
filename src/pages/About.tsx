import { Bell, ClipboardList, MessageCircle, Package, Search, ShoppingBag, Store, UserPlus } from 'lucide-react';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import type { Business } from '@shared/types';
import { Awning } from '@/components/common/Awning';
import { Button } from '@/components/ui/button';
import { useFetch } from '@/hooks/useFetch';
import { useTitle } from '@/hooks/useTitle';

const BUYER_STEPS = [
  { icon: Search, title: 'Explorá', text: 'Buscá por rubro, barrio o producto y mirá quién está abierto ahora.' },
  { icon: ShoppingBag, title: 'Armá tu pedido', text: 'Sumá productos al carrito, elegí si retirás o te lo envían y cómo pagás.' },
  { icon: MessageCircle, title: 'Envialo por WhatsApp', text: 'Le llega al comercio el link de tu pedido, y vos seguís el estado en vivo hasta que está listo.' },
];

const BUSINESS_STEPS = [
  { icon: UserPlus, title: 'Registrá tu negocio', text: 'Creás tu cuenta, con email o con Google, y tu página queda publicada.' },
  { icon: Package, title: 'Cargá productos y horarios', text: 'Fotos, precios, categorías, formas de entrega y de pago, y cuándo abrís.' },
  { icon: Bell, title: 'Recibí pedidos', text: 'Te avisamos al instante y los llevás en tres pasos: nuevo, confirmado y entregado.' },
];

const VALUES = [
  { title: 'Simple para los dos lados', text: 'Sin apps nuevas que instalar: el pedido se cierra en WhatsApp, donde ya conversan.' },
  { title: 'El comercio de cercanía primero', text: 'Las vidrieras del barrio, en línea: la panadería de la esquina, la verdulería, la rotisería de siempre.' },
  { title: 'Sin intermediarios en el pago', text: 'Publicar es gratis y el pago se arregla directo entre quien compra y el comercio.' },
];

function Steps({ title, icon: Icon, steps }: { title: string; icon: typeof Store; steps: typeof BUYER_STEPS }) {
  return (
    <section className="rounded-2xl border bg-card p-6">
      <h2 className="flex items-center gap-2 text-xl font-bold"><Icon className="size-5 text-primary" /> {title}</h2>
      <ol className="mt-5 space-y-5">
        {steps.map((step, i) => (
          <li key={step.title} className="flex gap-4">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-primary"><step.icon className="size-5" /></span>
            <div>
              <p className="font-semibold">{i + 1}. {step.title}</p>
              <p className="text-sm text-muted-foreground">{step.text}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

export default function About() {
  useTitle('Nosotros');
  const businesses = useFetch<Business[]>('/businesses');

  // Real numbers from the directory; nothing is shown until they arrive.
  const stats = useMemo(() => {
    const list = businesses.data ?? [];
    if (list.length === 0) return null;
    const categories = new Set(list.map((b) => b.category?.slug).filter(Boolean));
    const places = new Set(list.map((b) => b.neighborhood ?? b.city).filter(Boolean));
    return [
      { value: list.length, label: list.length === 1 ? 'comercio' : 'comercios' },
      { value: categories.size, label: categories.size === 1 ? 'rubro' : 'rubros' },
      { value: places.size, label: places.size === 1 ? 'barrio' : 'barrios' },
    ];
  }, [businesses.data]);

  return (
    <div>
      <section className="relative overflow-hidden bg-sidebar text-sidebar-accent-foreground">
        <Awning />
        <div className="mx-auto max-w-page px-4 py-14 sm:py-20">
          <p className="flex items-center gap-2 text-sm font-medium text-sidebar-foreground"><span className="size-1.5 rounded-full bg-mustard" aria-hidden /> Sobre Detoke</p>
          <h1 className="mt-4 max-w-2xl text-4xl font-extrabold leading-tight sm:text-6xl">Todo el barrio, <span className="text-mustard">de toque.</span></h1>
          <p className="mt-5 max-w-2xl text-base text-sidebar-foreground sm:text-lg">
            Detoke reúne a los comercios de tu barrio en un solo lugar: cada uno con su catálogo, sus horarios y sus formas de entrega.
            Elegís, armás el pedido y lo cerrás por WhatsApp, directo con quien te atiende.
          </p>
          {stats && (
            <dl className="mt-8 flex flex-wrap gap-x-10 gap-y-4">
              {stats.map((s) => (
                <div key={s.label}>
                  <dt className="sr-only">{s.label}</dt>
                  <dd><span className="font-display text-3xl font-bold text-sidebar-accent-foreground sm:text-4xl">{s.value}</span> <span className="text-sidebar-foreground">{s.label}</span></dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </section>

      <div className="mx-auto max-w-page space-y-12 px-4 py-12">
        <div className="grid gap-6 lg:grid-cols-2">
          <Steps title="Si comprás" icon={ShoppingBag} steps={BUYER_STEPS} />
          <Steps title="Si tenés un comercio" icon={Store} steps={BUSINESS_STEPS} />
        </div>

        <section>
          <h2 className="text-2xl font-bold sm:text-3xl">Por qué Detoke</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {VALUES.map((v) => (
              <div key={v.title} className="rounded-2xl border bg-card p-5">
                <p className="font-semibold">{v.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{v.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="flex flex-col items-start gap-5 rounded-2xl bg-accent p-6 text-accent-foreground sm:flex-row sm:items-center sm:justify-between sm:p-10">
          <div>
            <h2 className="text-2xl font-bold sm:text-3xl">¿Arrancamos?</h2>
            <p className="mt-1 max-w-lg">Mirá qué hay hoy en tu barrio, o sumá tu comercio y empezá a recibir pedidos.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild size="lg"><Link to="/explorar"><Search /> Explorar negocios</Link></Button>
            <Button asChild size="lg" variant="outline" className="bg-card"><Link to="/register"><Store /> Sumá tu negocio</Link></Button>
          </div>
        </section>

        <p className="flex items-center gap-2 text-sm text-muted-foreground"><ClipboardList className="size-4" /> <span>¿Dudas o sugerencias? <Link to="/contact" className="font-medium text-foreground hover:underline">Escribinos</Link>.</span></p>
      </div>
    </div>
  );
}
