// Development only (/dev/logo): the three logo explorations side by side, in context.
import { MARKS, Wordmark, type MarkName } from '@/components/brand/LogoMarks';

const NAMES: Record<MarkName, string> = { awning: 'A · Toldo (en uso)', letter: 'B · Letra d', pin: 'C · Pin' };

function Contexts({ name, dark }: { name: MarkName; dark: boolean }) {
  const Mark = MARKS[name];
  return (
    <div className={`${dark ? 'dark' : ''} rounded-2xl border`}>
      <div className="space-y-4 rounded-2xl bg-background p-4 text-foreground">
        <div className="flex h-14 items-center gap-2 rounded-xl border bg-navbar px-4">
          <Mark className="size-8" />
          <Wordmark className="text-primary" />
          <span className="ml-6 text-sm text-muted-foreground">Explorar · Nosotros · Contacto</span>
        </div>
        <div className="flex items-end gap-6">
          <div className="flex w-12 flex-col items-center gap-3 rounded-xl bg-sidebar py-3">
            <Mark className="size-8" />
            <span className="h-1.5 w-6 rounded bg-sidebar-foreground/40" />
            <span className="h-1.5 w-6 rounded bg-sidebar-foreground/40" />
          </div>
          <div className="flex items-end gap-3">
            <Mark className="size-4" />
            <Mark className="size-8" />
            <Mark className="size-16" />
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Mark mono className="size-8" />
            <span className="text-xs">monocromo</span>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-sidebar p-4 text-sidebar-accent-foreground">
          <Mark className="size-7" />
          <Wordmark />
        </div>
      </div>
    </div>
  );
}

export default function LogoPreview() {
  return (
    <div className="mx-auto max-w-page space-y-10 px-4 py-10">
      <div>
        <h1 className="text-3xl font-bold">Logo: propuestas</h1>
        <p className="text-muted-foreground">Solo en desarrollo. Para cambiar la que usa la app, editá <code>LogoMark</code> en src/components/brand/LogoMarks.tsx y regenerá el favicon con <code>npm run brand:icons</code>.</p>
      </div>
      {(Object.keys(MARKS) as MarkName[]).map((name) => (
        <section key={name} className="space-y-3">
          <h2 className="text-xl font-semibold">{NAMES[name]}</h2>
          <div className="grid gap-4 lg:grid-cols-2">
            <Contexts name={name} dark={false} />
            <Contexts name={name} dark />
          </div>
        </section>
      ))}
    </div>
  );
}
