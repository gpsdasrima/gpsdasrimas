import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents, Circle, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { useEffect, useRef } from 'react';
import type { Battle, BattleLiveState } from '../types';
import { liveStateColor } from '../utils/date';

interface Props {
  battles: { battle: Battle; state: BattleLiveState }[];
  center: [number, number];
  zoom?: number;
  userLocation?: [number, number] | null;
  /** Raio de precisão do GPS em metros, exibido como um halo ao redor do usuário. */
  userAccuracy?: number | null;
  /** Direção do movimento em graus, se disponível (mostra uma seta apontando pra onde a pessoa está indo). */
  userHeading?: number | null;
  /** true quando a posição está sendo atualizada continuamente (watchPosition) — mostra o pulso "ao vivo". */
  userLive?: boolean;
  /** Geometria de uma rota real (lat/lng) a ser desenhada no mapa. */
  route?: [number, number][] | null;
  /** Modo navegação ao vivo: a câmera segue o usuário em vez de manter o enquadramento da rota. */
  followUser?: boolean;
  onSelectBattle?: (battle: Battle) => void;
  /** Ativa o modo "toque no mapa para marcar um ponto" (usado quando o GPS não está disponível). */
  pickable?: boolean;
  onPickLocation?: (coords: [number, number]) => void;
  className?: string;
}

// Tiles do Esri World Dark Gray têm resolução nativa até z16 — além disso o
// Leaflet amplia (upscale) o último nível em vez de mostrar tile em branco.
const MAX_ZOOM = 20;

function pinIcon(color: string) {
  return L.divIcon({
    className: '',
    html: `<div style="
        width:26px;height:26px;border-radius:50% 50% 50% 0;
        background:${color};transform:rotate(-45deg);
        border:2px solid rgba(10,10,12,0.85);
        box-shadow:0 2px 6px rgba(0,0,0,0.5);
      "></div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 26],
    popupAnchor: [0, -26],
  });
}

/** Bolinha azul "você está aqui", com pulso quando a posição está sendo seguida em tempo real. */
function liveLocationIcon(live: boolean, heading: number | null) {
  // Gira o conjunto inteiro (seta + bolinha) para a direção do movimento —
  // a seta fica desenhada apontando "para cima" (norte / 0°) por padrão.
  const rotation = heading !== null ? `transform: rotate(${heading}deg);` : '';
  return L.divIcon({
    className: '',
    html: `<div class="gps-live-marker" style="${rotation}">
        ${live ? '<div class="gps-live-ring"></div>' : ''}
        ${heading !== null ? '<div class="gps-live-heading"></div>' : ''}
        <div class="gps-live-dot"></div>
      </div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
}

/**
 * Corrige o bug mais comum de Leaflet dentro de layouts flex/responsivos:
 * quando o container muda de tamanho (troca de aba, abrir/fechar tela
 * cheia, rotacionar o celular...) o Leaflet não percebe sozinho e os tiles
 * ficam cinzas, cortados ou fora de posição. Isso resolve chamando
 * invalidateSize() sempre que o tamanho do container mudar.
 */
function InvalidateOnResize() {
  const map = useMap();
  useEffect(() => {
    const container = map.getContainer();
    const observer = new ResizeObserver(() => {
      map.invalidateSize();
    });
    observer.observe(container);
    // Uma primeira chamada garante o tamanho correto assim que monta.
    const t = setTimeout(() => map.invalidateSize(), 50);
    return () => {
      observer.disconnect();
      clearTimeout(t);
    };
  }, [map]);
  return null;
}

/**
 * Recentraliza o mapa quando `center`/`zoom` mudam de fora (ex.: usuário
 * escolheu outra batalha). Fica em silêncio enquanto uma rota está sendo
 * exibida, porque nesse caso quem manda no enquadramento é o FitRoute —
 * do contrário os dois brigavam pelo controle da câmera e o mapa parecia
 * "travado"/tremendo.
 */
function Recenter({
  center,
  zoom,
  skip,
}: {
  center: [number, number];
  zoom?: number;
  skip: boolean;
}) {
  const map = useMap();
  const last = useRef<string>('');
  useEffect(() => {
    if (skip) return;
    const key = `${center[0].toFixed(5)},${center[1].toFixed(5)},${zoom ?? ''}`;
    if (key === last.current) return;
    last.current = key;
    map.setView(center, zoom ?? map.getZoom(), { animate: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center[0], center[1], zoom, skip]);
  return null;
}

/** Ajusta o zoom/enquadramento automaticamente para mostrar a rota inteira. */
function FitRoute({ route }: { route: [number, number][] | null | undefined }) {
  const map = useMap();
  useEffect(() => {
    if (route && route.length > 1) {
      map.fitBounds(L.latLngBounds(route), { padding: [48, 48], maxZoom: 16 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route]);
  return null;
}

function ClickToPick({ enabled, onPick }: { enabled: boolean; onPick?: (coords: [number, number]) => void }) {
  useMapEvents({
    click(e) {
      if (enabled) onPick?.([e.latlng.lat, e.latlng.lng]);
    },
  });
  return null;
}

export function BattleMap({
  battles,
  center,
  zoom = 12,
  userLocation,
  userAccuracy,
  userHeading,
  userLive,
  route,
  followUser,
  onSelectBattle,
  pickable,
  onPickLocation,
  className,
}: Props) {
  const hasRoute = !!route && route.length > 1;

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      maxZoom={MAX_ZOOM}
      minZoom={3}
      zoomControl={true}
      attributionControl={true}
      scrollWheelZoom={true}
      className={[className ?? 'h-full w-full', pickable ? 'cursor-crosshair' : ''].join(' ').trim()}
    >
      <InvalidateOnResize />
      <Recenter center={center} zoom={zoom} skip={hasRoute && !followUser} />
      <FitRoute route={followUser ? null : route} />
      <ClickToPick enabled={!!pickable} onPick={onPickLocation} />
      <TileLayer
        url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
        attribution='&copy; <a href="https://www.esri.com">Esri</a>, HERE, Garmin, FAO, NOAA, USGS &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        maxZoom={MAX_ZOOM}
        maxNativeZoom={16}
      />
      <TileLayer
        url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}"
        maxZoom={MAX_ZOOM}
        maxNativeZoom={16}
      />

      {hasRoute && (
        <>
          {/* Contorno escuro por baixo para dar contraste à linha em qualquer fundo de mapa */}
          <Polyline positions={route!} pathOptions={{ color: '#0a0a0c', weight: 7, opacity: 0.6 }} />
          <Polyline positions={route!} pathOptions={{ color: '#e3ff2e', weight: 4, opacity: 0.95 }} />
        </>
      )}

      {userLocation && (
        <>
          {typeof userAccuracy === 'number' && userAccuracy > 0 && (
            <Circle
              center={userLocation}
              radius={userAccuracy}
              pathOptions={{ color: '#3d8bff', fillColor: '#3d8bff', fillOpacity: 0.08, weight: 1 }}
            />
          )}
          <Marker position={userLocation} icon={liveLocationIcon(!!userLive, userHeading ?? null)}>
            <Popup>{userLive ? 'Você está aqui (ao vivo)' : 'Você está aqui'}</Popup>
          </Marker>
        </>
      )}

      {battles.map(({ battle, state }) => (
        <Marker
          key={battle.id}
          position={[battle.latitude, battle.longitude]}
          icon={pinIcon(liveStateColor(state))}
          eventHandlers={{
            click: () => onSelectBattle?.(battle),
          }}
        >
          <Popup>
            <strong>{battle.name}</strong>
            <br />
            {battle.neighborhood}, {battle.city}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
