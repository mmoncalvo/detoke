import { MapPinOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import { EmptyState } from '@/components/common/States';
import { Button } from '@/components/ui/button';
import { useTitle } from '@/hooks/useTitle';

export default function NotFound() {
  useTitle('Página no encontrada');
  return (
    <div className="mx-auto max-w-xl px-4 py-20">
      <EmptyState icon={MapPinOff} title="Esta página no existe" description="Puede que el enlace esté mal o que el negocio ya no esté publicado." action={<Button asChild><Link to="/explorar">Explorar negocios</Link></Button>} />
    </div>
  );
}
