// Development only (/dev/logo): the logo "detoke!" (one color and with a mustard "!"), and the "d!" monogram.
import { LogoMark, Wordmark } from '@/components/brand/LogoMarks';

function Contexts({ accent, dark }: { accent: boolean; dark: boolean }) {
  return (
    <div className={`${dark ? 'dark' : ''} rounded-2xl border`}>
      <div className="space-y-4 rounded-2xl bg-background p-4 text-foreground">
        <div className="flex h-14 items-center gap-6 rounded-xl border bg-navbar px-4">
          <Wordmark accent={accent} className="text-[1.6rem] text-primary" />
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
          <div className="flex items-center gap-3 text-muted-foreground">
            <LogoMark mono className="size-8" />
            <Wordmark className="text-[1.6rem]" />
          </div>
        </div>
        <div className="flex items-center rounded-xl bg-sidebar p-4 text-sidebar-accent-foreground">
          <Wordmark accent={accent} className="text-[1.6rem]" />
        </div>
        <Wordmark accent={accent} className="text-6xl text-primary" />
      </div>
    </div>
  );
}

export default function LogoPreview() {
  return (
    <div className="mx-auto max-w-page space-y-10 px-4 py-10">
      <div>
        <h1 className="text-3xl font-bold">Logo: detoke!</h1>
        <p className="text-muted-foreground">Solo en desarrollo. Arriba, la versión en uso (un color); abajo, la alternativa con el “!” en mostaza. El monograma “d!” va donde no entra la palabra.</p>
      </div>
      {[false, true].map((accent) => (
        <section key={String(accent)} className="space-y-3">
          <h2 className="text-xl font-semibold">{accent ? 'Alternativa: “!” en mostaza' : 'En uso: un solo color'}</h2>
          <div className="grid gap-4 lg:grid-cols-2">
            <Contexts accent={accent} dark={false} />
            <Contexts accent={accent} dark />
          </div>
        </section>
      ))}
    </div>
  );
}
