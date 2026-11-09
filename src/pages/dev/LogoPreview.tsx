// Development only (/dev/logo): the refined mark with the four candidate typefaces, in context.
import { LogoMark, Wordmark, WORDMARK } from '@/components/brand/LogoMarks';
import { WORDMARKS, type WordmarkName } from '@/components/brand/wordmarks';

function Lockup({ name, className = 'text-primary' }: { name: WordmarkName; className?: string }) {
  return (
    <span className="flex items-center gap-2">
      <LogoMark className="size-8" />
      <Wordmark name={name} className={className} />
    </span>
  );
}

function Contexts({ name, dark }: { name: WordmarkName; dark: boolean }) {
  return (
    <div className={`${dark ? 'dark' : ''} rounded-2xl border`}>
      <div className="space-y-4 rounded-2xl bg-background p-4 text-foreground">
        <div className="flex h-14 items-center gap-6 rounded-xl border bg-navbar px-4">
          <Lockup name={name} />
          <span className="text-sm text-muted-foreground">Explorar · Nosotros · Contacto</span>
        </div>
        <div className="flex items-end gap-6">
          <div className="flex w-12 flex-col items-center gap-3 rounded-xl bg-sidebar py-3">
            <LogoMark className="size-8" />
            <span className="h-1.5 w-6 rounded bg-sidebar-foreground/40" />
          </div>
          <div className="flex items-end gap-3">
            <LogoMark className="size-4" />
            <LogoMark className="size-8" />
            <LogoMark className="size-16" />
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <LogoMark mono className="size-8" />
            <Wordmark name={name} accent={false} />
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-sidebar p-4 text-sidebar-accent-foreground">
          <Lockup name={name} className="" />
        </div>
        <Wordmark name={name} className="text-5xl text-primary" />
      </div>
    </div>
  );
}

export default function LogoPreview() {
  const names = Object.keys(WORDMARKS) as WordmarkName[];
  return (
    <div className="mx-auto max-w-page space-y-10 px-4 py-10">
      <div>
        <h1 className="text-3xl font-bold">Logo: tipografías</h1>
        <p className="text-muted-foreground">Solo en desarrollo. El isotipo es el mismo; cambia la letra de “detoke”. Para usar otra, cambiá <code>WORDMARK</code> en src/components/brand/LogoMarks.tsx.</p>
      </div>
      {names.map((name) => (
        <section key={name} className="space-y-3">
          <h2 className="text-xl font-semibold">{WORDMARKS[name].name}{name === WORDMARK ? ' (en uso)' : ''}</h2>
          <div className="grid gap-4 lg:grid-cols-2">
            <Contexts name={name} dark={false} />
            <Contexts name={name} dark />
          </div>
        </section>
      ))}
    </div>
  );
}
