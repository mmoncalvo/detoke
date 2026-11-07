import { Copy, Plus, X } from 'lucide-react';
import { DAYS, DAY_LABELS, type BusinessHours, type Day, type DayHours } from '@shared/business';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';

export function HoursEditor({ value, onChange }: { value: BusinessHours; onChange: (hours: BusinessHours) => void }) {
  const update = (day: Day, next: DayHours) => onChange({ ...value, [day]: next });

  const toggle = (day: Day, open: boolean) => {
    const current = value[day];
    update(day, { open, ranges: open && current.ranges.length === 0 ? [{ from: '09:00', to: '18:00' }] : current.ranges });
  };

  const setRange = (day: Day, index: number, key: 'from' | 'to', time: string) => {
    update(day, { ...value[day], ranges: value[day].ranges.map((r, i) => (i === index ? { ...r, [key]: time } : r)) });
  };

  const copyToAll = (source: Day) => {
    onChange(Object.fromEntries(DAYS.map((day) => [day, value[day].open ? { open: true, ranges: value[source].ranges.map((r) => ({ ...r })) } : value[day]])) as unknown as BusinessHours);
  };

  return (
    <ul className="divide-y rounded-xl border bg-card">
      {DAYS.map((day) => {
        const { open, ranges } = value[day];
        return (
          <li key={day} className="flex flex-col gap-3 p-3 sm:flex-row sm:items-start">
            <div className="flex h-9 items-center gap-3 sm:w-44">
              <Switch id={`day-${day}`} checked={open} onCheckedChange={(v) => toggle(day, v)} aria-label={`${DAY_LABELS[day]} abierto`} />
              <label htmlFor={`day-${day}`} className="text-sm font-medium">{DAY_LABELS[day]}</label>
            </div>
            {open ? (
              <div className="flex-1 space-y-2">
                {ranges.map((range, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input type="time" value={range.from} onChange={(e) => setRange(day, index, 'from', e.target.value)} className="w-28" aria-label={`${DAY_LABELS[day]}, desde`} />
                    <span className="text-sm text-muted-foreground">a</span>
                    <Input type="time" value={range.to} onChange={(e) => setRange(day, index, 'to', e.target.value)} className="w-28" aria-label={`${DAY_LABELS[day]}, hasta`} />
                    {ranges.length > 1 && (
                      <Button type="button" variant="ghost" size="icon" className="size-8" aria-label="Quitar franja" onClick={() => update(day, { ...value[day], ranges: ranges.filter((_, i) => i !== index) })}><X className="size-4" /></Button>
                    )}
                  </div>
                ))}
                <div className="flex flex-wrap gap-1">
                  {ranges.length < 2 && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => update(day, { ...value[day], ranges: [...ranges, { from: '16:00', to: '20:00' }] })}><Plus /> Horario cortado</Button>
                  )}
                  <Button type="button" variant="ghost" size="sm" onClick={() => copyToAll(day)}><Copy /> Copiar a los días abiertos</Button>
                </div>
              </div>
            ) : <p className="flex h-9 items-center text-sm text-muted-foreground">Cerrado</p>}
          </li>
        );
      })}
    </ul>
  );
}
