import { LogOut, ReceiptText, Store } from 'lucide-react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { useTitle } from '@/hooks/useTitle';
import { PreferencesCard, ProfileCard, SecurityCard } from '@/pages/dashboard/Account';

/** Mi cuenta for buyers, in the public site (sellers have it in their panel). */
export default function CustomerAccount() {
  useTitle('Mi cuenta');
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  if (user && user.role !== 'customer') return <Navigate to="/dashboard/account" replace />;

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-3xl font-bold sm:text-4xl">Mi cuenta</h1>
        <Button asChild variant="outline"><Link to="/mis-pedidos"><ReceiptText /> Mis pedidos</Link></Button>
      </div>
      <ProfileCard />
      <SecurityCard />
      <PreferencesCard />
      <section className="flex flex-col items-start gap-3 rounded-2xl border bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold">¿Tenés un comercio?</p>
          <p className="text-sm text-muted-foreground">Sumalo a tu cuenta y empezá a recibir pedidos. Vas a seguir pudiendo comprar.</p>
        </div>
        <Button asChild variant="outline"><Link to="/register?type=business"><Store /> Sumar mi negocio</Link></Button>
      </section>
      <div className="flex justify-end">
        <Button variant="ghost" className="text-muted-foreground" onClick={() => { signOut(); navigate('/'); }}><LogOut /> Cerrar sesión</Button>
      </div>
    </div>
  );
}
