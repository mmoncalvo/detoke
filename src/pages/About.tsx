import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import type { Business } from '@shared/types';
import { Button } from '@/components/ui/button';
import { useFetch } from '@/hooks/useFetch';
import { useTitle } from '@/hooks/useTitle';

const HOW = [
  { title: 'Si comprás', steps: ['Explorá los comercios del barrio.', 'Armá tu pedido.', 'Envialo por WhatsApp y seguí el estado.'] },
  { title: 'Si tenés un comercio', steps: ['Registrá tu negocio gratis.', 'Cargá productos y horarios.', 'Recibí pedidos con aviso al instante.'] },
];

export default function About() {
  useTitle('Nosotros');
  const businesses = useFetch<Business[]>('/businesses');

  // Real numbers from the directory, shown once they arrive.
  const stats = useMemo(() => {
    const list = businesses.data ?? [];
    if (list.length === 0) return null;
    const categories = new Set(list.map((b) => b.category?.slug).filter(Boolean)).size;
    const places = new Set(list.map((b) => b.neighborhood ?? b.city).filter(Boolean)).size;
    return `${list.length} comercios · ${categories} rubros · ${places} barrios`;
  }, [businesses.data]);

  return (
    <div className="mx-auto max-w-form px-4 py-12 sm:py-20 sm:pb-6">
      <h1 className="text-4xl font-extrabold leading-tight sm:text-5xl">Todo el barrio, <span className="text-primary">de toque.</span></h1>
      <p className="mt-4 text-lg text-muted-foreground">Los comercios de tu barrio en un solo lugar. Elegís, armás el pedido y lo cerrás por WhatsApp, directo con quien te atiende.</p>
      {stats && <p className="mt-3 text-sm font-medium">{stats}</p>}

      <div className="mt-12 grid gap-8 sm:grid-cols-2">
        {HOW.map((group) => (
          <section key={group.title}>
            <h2 className="font-semibold">{group.title}</h2>
            <ol className="mt-3 list-inside list-decimal space-y-1.5 text-muted-foreground marker:text-primary">
              {group.steps.map((step) => <li key={step}>{step}</li>)}
            </ol>
          </section>
        ))}
      </div>

      <div className="mt-12 flex flex-wrap items-center gap-2">
        <Button asChild><Link to="/explorar">Explorar negocios</Link></Button>
        <Button asChild variant="outline"><Link to="/register">Sumá tu negocio</Link></Button>
        <Button asChild variant="ghost" className="text-muted-foreground"><Link to="/contact">Contacto</Link></Button>
      </div>
    </div>
  );
}
