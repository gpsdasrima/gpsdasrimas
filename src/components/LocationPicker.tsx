import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { useEffect } from 'react';

interface Props {
  value: [number, number] | null;
  onChange: (coords: [number, number]) => void;
  center?: [number, number];
}

const MAX_ZOOM = 20;

const pickIcon = L.divIcon({
  className: '',
  html: `<div style="
      width:28px;height:28px;border-radius:50% 50% 50% 0;
      background:#E3FF2E;transform:rotate(-45deg);
      border:2px solid rgba(10,10,12,0.85);
      box-shadow:0 2px 8px rgba(0,0,0,0.5);
    "></div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 28],
});

function ClickHandler({ onChange }: { onChange: (coords: [number, number]) => void }) {
  useMapEvents({
    click(e) {
      onChange([e.latlng.lat, e.latlng.lng]);
    },
  });
  return null;
}

/** Mesmo fix do BattleMap: evita tiles cinzas/cortados quando o container muda de tamanho. */
function InvalidateOnResize() {
  const map = useMap();
  useEffect(() => {
    const container = map.getContainer();
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(container);
    const t = setTimeout(() => map.invalidateSize(), 50);
    return () => {
      observer.disconnect();
      clearTimeout(t);
    };
  }, [map]);
  return null;
}

export function LocationPicker({ value, onChange, center }: Props) {
  return (
    <MapContainer
      center={value ?? center ?? [-14.235, -51.9253]}
      zoom={value ? 15 : 4}
      maxZoom={MAX_ZOOM}
      minZoom={3}
      className="h-full w-full cursor-crosshair"
    >
      <InvalidateOnResize />
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; OpenStreetMap contributors &copy; CARTO'
        maxZoom={MAX_ZOOM}
        maxNativeZoom={20}
      />
      <ClickHandler onChange={onChange} />
      {value && <Marker position={value} icon={pickIcon} />}
    </MapContainer>
  );
}
