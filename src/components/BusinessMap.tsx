import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

interface BusinessMapProps {
  center: [number, number];
  address: string;
  businessName: string;
}

export default function BusinessMap({ center, address, businessName }: BusinessMapProps) {
  return (
    <div className="rounded-2xl overflow-hidden h-full">
      <MapContainer center={center} zoom={15} scrollWheelZoom={false} zoomControl={true} className='z-10 h-full' style={{ width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={center}>
          <Popup>
            <div>
              <strong>{businessName}</strong><br />
              {address}<br />
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${center[0]},${center[1]}`}
                target="_blank"
                rel="noopener"
                className="text-emerald-600 hover:text-emerald-800"
              >
                📍 Get Directions
              </a>
            </div>
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}
