import { openStatus, type BusinessHours } from '@shared/business';
import { Badge } from '@/components/ui/badge';

export function OpenBadge({ hours, detailed, className }: { hours: BusinessHours; detailed?: boolean; className?: string }) {
  const { isOpen, label } = openStatus(hours);
  return (
    <Badge variant={isOpen ? 'success' : 'secondary'} className={className}>
      <span className={`size-1.5 rounded-full ${isOpen ? 'bg-success' : 'bg-muted-foreground'}`} aria-hidden />
      {detailed ? label : isOpen ? 'Abierto' : 'Cerrado'}
    </Badge>
  );
}
