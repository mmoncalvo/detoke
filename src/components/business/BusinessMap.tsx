import { Marker } from 'react-leaflet';
import { BaseMap, mapPin } from '@/components/map/BaseMap';

export default function BusinessMap({ latitude, longitude }: { latitude: number; longitude: number }) {
  return (
    <BaseMap center={[latitude, longitude]} zoom={15} className="h-48 w-full rounded-xl">
      <Marker position={[latitude, longitude]} icon={mapPin} />
    </BaseMap>
  );
}
