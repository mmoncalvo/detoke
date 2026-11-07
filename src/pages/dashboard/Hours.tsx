import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { defaultHours, hasHours } from '@shared/business';
import { hoursSchema } from '@shared/schemas';
import { HoursEditor } from '@/components/dashboard/HoursEditor';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { useBusinessSaver } from '@/hooks/useBusinessSaver';
import { useTitle } from '@/hooks/useTitle';

export default function Hours() {
  useTitle('Horarios');
  const { business } = useAuth();
  const { save } = useBusinessSaver();
  const [hours, setHours] = useState(() => (business && hasHours(business.hours) ? business.hours : defaultHours()));
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const parsed = hoursSchema.safeParse(hours);
    if (!parsed.success) return void toast.error(parsed.error.issues[0]?.message ?? 'Revisá los horarios');
    setBusy(true);
    await save({ hours }, 'Horarios guardados');
    setBusy(false);
  };

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground">Definí cuándo atendés. Si cortás al mediodía, usá “Horario cortado”. Para cerrar pasada la medianoche, poné un horario de fin menor al de inicio.</p>
      <HoursEditor value={hours} onChange={setHours} />
      <Button size="lg" onClick={submit} disabled={busy}>{busy && <Loader2 className="animate-spin" />} Guardar horarios</Button>
    </div>
  );
}
