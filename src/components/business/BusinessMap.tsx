import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapContainer, Marker, TileLayer } from 'react-leaflet';

export const mapPin = L.divIcon({
  className: '',
  iconSize: [30, 38],
  iconAnchor: [15, 38],
  html: '<svg width="30" height="38" viewBox="0 0 30 38" xmlns="http://www.w3.org/2000/svg"><path d="M15 0C6.7 0 0 6.7 0 15c0 10.5 15 23 15 23s15-12.5 15-23C30 6.7 23.3 0 15 0z" fill="#1E5F48"/><circle cx="15" cy="15" r="6" fill="#E3A82B"/></svg>',
});

export default function BusinessMap({ latitude, longitude }: { latitude: number; longitude: number }) {
  return (
    <MapContainer center={[latitude, longitude]} zoom={15} scrollWheelZoom={false} className="h-48 w-full rounded-xl">
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <Marker position={[latitude, longitude]} icon={mapPin} />
    </MapContainer>
  );
}
