import type { LucideIcon } from 'lucide-react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';

export function PageLoader() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center text-muted-foreground" role="status" aria-label="Cargando">
      <Loader2 className="size-6 animate-spin" />
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action }: { icon: LucideIcon; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed bg-card/60 px-6 py-14 text-center">
      <span className="mb-4 flex size-12 items-center justify-center rounded-full bg-secondary text-muted-foreground">
        <Icon className="size-5" />
      </span>
      <h3 className="text-lg font-semibold">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <EmptyState
      icon={AlertTriangle}
      title="No pudimos cargar esto"
      description={message}
      action={onRetry && <Button variant="outline" onClick={onRetry}>Reintentar</Button>}
    />
  );
}
