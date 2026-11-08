import { LocateFixed } from 'lucide-react';
import { useEffect } from 'react';
import { Marker, useMap, useMapEvents } from 'react-leaflet';
import { toast } from 'sonner';
import { BaseMap, mapPin } from '@/components/map/BaseMap';
import { Button } from '@/components/ui/button';

const DEFAULT_CENTER: [number, number] = [-34.6037, -58.4];

export interface Point {
  latitude: number | null;
  longitude: number | null;
}

/** Moves the map when something outside it picks a place; `zoom` changes with what was picked. */
export interface MapView {
  zoom: number;
  /** Changes on every pick, so picking the same place twice still moves the map. */
  key: number;
}

function ClickHandler({ onChange }: { onChange: (point: Point) => void }) {
  useMapEvents({ click: (e) => onChange({ latitude: e.latlng.lat, longitude: e.latlng.lng }) });
  return null;
}

function FollowView({ position, view }: { position: [number, number] | null; view?: MapView }) {
  const map = useMap();
  useEffect(() => {
    if (!position) return;
    if (view) map.flyTo(position, view.zoom, { duration: 0.6 });
    else map.panTo(position);
  }, [map, view?.key, position?.[0], position?.[1]]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

/** Map to mark a business location: tap, drag the pin, or use the device location. */
export default function LocationPicker({ value, view, onChange }: { value: Point; view?: MapView; onChange: (point: Point) => void }) {
  const position: [number, number] | null = value.latitude != null && value.longitude != null ? [value.latitude, value.longitude] : null;

  const locate = () => {
    if (!navigator.geolocation) return toast.error('Tu navegador no permite usar la ubicación');
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => onChange({ latitude: coords.latitude, longitude: coords.longitude }),
      () => toast.error('No pudimos obtener tu ubicación. Marcala tocando el mapa.'),
    );
  };

  return (
    <div className="space-y-2">
      <div className="overflow-hidden rounded-xl border">
        <BaseMap center={position ?? DEFAULT_CENTER} zoom={position ? 16 : 12} className="h-64 w-full">
          <ClickHandler onChange={onChange} />
          <FollowView position={position} view={view} />
          {position && (
            <Marker
              position={position}
              icon={mapPin}
              draggable
              eventHandlers={{ dragend: (e) => { const { lat, lng } = e.target.getLatLng(); onChange({ latitude: lat, longitude: lng }); } }}
            />
          )}
        </BaseMap>
      </div>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{position ? 'Arrastrá el marcador o tocá el mapa para ajustarlo.' : 'Tocá el mapa para marcar tu local.'}</p>
        <Button type="button" variant="outline" size="sm" onClick={locate}><LocateFixed /> Usar mi ubicación</Button>
      </div>
    </div>
  );
}
