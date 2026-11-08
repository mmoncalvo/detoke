import { Loader2, MapPinned, Undo2 } from 'lucide-react';
import { lazy, Suspense, useCallback, useRef, useState } from 'react';
import type { AddressOption, CityOption } from '@shared/geo';
import { api } from '@/api';
import { Autocomplete } from '@/components/common/Autocomplete';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { MapView, Point } from './LocationPicker';

const LocationPicker = lazy(() => import('./LocationPicker'));

export interface LocationValue {
  address: string;
  neighborhood: string;
  city: string;
  province: string;
  postalCode: string;
  latitude: number | null;
  longitude: number | null;
}

type TextField = 'address' | 'neighborhood' | 'city' | 'province' | 'postalCode';
const TEXT_FIELDS: TextField[] = ['address', 'neighborhood', 'city', 'province', 'postalCode'];

const searchCities = (q: string) => api<CityOption[]>(`/geo/cities?q=${encodeURIComponent(q)}`);

/** Fields from a found address; what it leaves out is kept only if it is still the same city. */
function merge(base: LocationValue, found: AddressOption, point: Point): LocationValue {
  const sameCity = !found.city || found.city === base.city;
  return {
    ...base,
    ...point,
    address: found.address,
    city: found.city ?? base.city,
    province: found.province ?? (sameCity ? base.province : ''),
    neighborhood: found.neighborhood ?? (sameCity ? base.neighborhood : ''),
    postalCode: found.postalCode ?? (sameCity ? base.postalCode : ''),
  };
}

/** The editable form of a business location, from its stored fields. */
export const toLocationValue = (b: { [K in TextField]?: string | null } & { latitude?: number | null; longitude?: number | null }): LocationValue => ({
  address: b.address ?? '',
  neighborhood: b.neighborhood ?? '',
  city: b.city ?? '',
  province: b.province ?? '',
  postalCode: b.postalCode ?? '',
  latitude: b.latitude ?? null,
  longitude: b.longitude ?? null,
});

/**
 * Address, city and map kept in sync: picking a city or an address moves the pin,
 * and moving the pin fills in the address (with a way to undo it).
 */
export function LocationFields({ value, onChange }: { value: LocationValue; onChange: (value: LocationValue) => void }) {
  const [view, setView] = useState<MapView>();
  const [lookingUp, setLookingUp] = useState(false);
  const [filled, setFilled] = useState<{ fields: TextField[]; previous: LocationValue } | null>(null);
  const [notFound, setNotFound] = useState(false);
  const lookup = useRef(0);
  const current = useRef(value);
  current.current = value;

  const fly = (zoom: number) => setView({ zoom, key: Date.now() });

  const set = (field: TextField, text: string) => {
    setFilled(null);
    onChange({ ...value, [field]: text });
  };

  const searchAddresses = useCallback((q: string) => {
    const { latitude, longitude } = current.current;
    const near = latitude != null && longitude != null ? `&lat=${latitude}&lng=${longitude}` : '';
    return api<AddressOption[]>(`/geo/addresses?q=${encodeURIComponent(q)}${near}`);
  }, []);

  const pickCity = (option: CityOption) => {
    setFilled(null);
    // Another city: the old street, barrio and postal code no longer apply.
    const sameCity = option.city === value.city;
    onChange({
      ...value,
      city: option.city,
      province: option.province,
      neighborhood: option.neighborhood ?? (sameCity ? value.neighborhood : ''),
      address: sameCity ? value.address : '',
      postalCode: sameCity ? value.postalCode : '',
      latitude: option.latitude,
      longitude: option.longitude,
    });
    fly(option.neighborhood ? 15 : 13);
  };

  const pickAddress = (option: AddressOption) => {
    setFilled(null);
    onChange(merge(value, option, { latitude: option.latitude, longitude: option.longitude }));
    fly(17);
  };

  /** The pin moved on the map: keep the point and fill in what is there. */
  const movePin = async (point: Point) => {
    const before = { ...current.current, ...point };
    onChange(before);
    setFilled(null);
    setNotFound(false);
    if (point.latitude == null || point.longitude == null) return;

    const ticket = ++lookup.current;
    setLookingUp(true);
    try {
      const found = await api<AddressOption | null>(`/geo/reverse?lat=${point.latitude}&lng=${point.longitude}`);
      if (ticket !== lookup.current) return;
      if (!found) return setNotFound(true);
      const next = merge(before, found, point);
      const changed = TEXT_FIELDS.filter((field) => next[field] !== before[field]);
      onChange(next);
      if (changed.length) setFilled({ fields: changed, previous: before });
    } catch {
      if (ticket === lookup.current) setNotFound(true);
    } finally {
      if (ticket === lookup.current) setLookingUp(false);
    }
  };

  const undo = () => {
    if (!filled) return;
    onChange({ ...filled.previous, latitude: current.current.latitude, longitude: current.current.longitude });
    setFilled(null);
  };

  const highlight = (field: TextField) => cn('transition-shadow', filled?.fields.includes(field) && 'ring-2 ring-mustard/70');

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="location-place">Ciudad</Label>
          <Autocomplete<CityOption>
            id="location-place"
            value={value.city}
            onInputChange={(text) => set('city', text)}
            search={searchCities}
            onSelect={pickCity}
            getKey={(c) => c.id}
            renderOption={(c) => (
              <>
                <span className="font-medium">{c.neighborhood ?? c.city}</span>
                <span className="text-muted-foreground">, {c.neighborhood ? c.city : c.province}{c.country !== 'Argentina' && `, ${c.country}`}</span>
              </>
            )}
            placeholder="Escribí tu ciudad"
            emptyText="No encontramos esa ciudad. Podés escribirla igual."
            className={highlight('city')}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="location-depto">Provincia o departamento</Label>
          <Input noAutofill id="location-depto" value={value.province} onChange={(e) => set('province', e.target.value)} className={highlight('province')} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="location-spot">Dirección</Label>
        <Autocomplete<AddressOption>
          id="location-spot"
          value={value.address}
          onInputChange={(text) => set('address', text)}
          search={searchAddresses}
          onSelect={pickAddress}
          getKey={(a) => a.id}
          renderOption={(a) => (
            <>
              <span className="font-medium">{a.address}</span>
              {(a.neighborhood || a.city) && <span className="text-muted-foreground">, {[a.neighborhood, a.city].filter(Boolean).join(', ')}</span>}
            </>
          )}
          minChars={3}
          placeholder={value.city ? `Calle y número en ${value.city}` : 'Calle y número'}
          emptyText="No encontramos esa dirección. Escribila y marcá el punto en el mapa."
          className={highlight('address')}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="location-barrio">Barrio</Label>
          <Input noAutofill id="location-barrio" value={value.neighborhood} onChange={(e) => set('neighborhood', e.target.value)} className={highlight('neighborhood')} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="location-cp">Código postal</Label>
          <Input noAutofill id="location-cp" value={value.postalCode} onChange={(e) => set('postalCode', e.target.value)} className={highlight('postalCode')} />
        </div>
      </div>

      <div aria-live="polite" className="min-h-6 text-sm">
        {lookingUp && <p className="flex items-center gap-2 text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Buscando dirección…</p>}
        {!lookingUp && filled && (
          <p className="flex flex-wrap items-center gap-x-2 text-muted-foreground">
            <MapPinned className="size-4 text-primary" /> Completamos los datos según el punto del mapa.
            <Button type="button" variant="link" size="sm" className="h-auto p-0" onClick={undo}><Undo2 className="size-3.5" /> Deshacer</Button>
          </p>
        )}
        {!lookingUp && notFound && <p className="text-muted-foreground">No encontramos una dirección en ese punto: completala a mano.</p>}
      </div>

      <Suspense fallback={<Skeleton className="h-64 w-full rounded-xl" />}>
        <LocationPicker value={value} view={view} onChange={movePin} />
      </Suspense>
    </div>
  );
}
