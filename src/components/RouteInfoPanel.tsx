import { externalNavLinks, formatDuration, type RouteResult } from '../utils/routing';

interface Props {
  route: RouteResult | null;
  loading: boolean;
  error?: string;
  destination: [number, number];
  origin?: [number, number] | null;
  onRetry?: () => void;
}

export function RouteInfoPanel({ route, loading, error, destination, origin, onRetry }: Props) {
  const links = externalNavLinks(destination, origin);

  return (
    <div className="rounded-xl border border-ink-600 bg-ink-800/90 p-3.5 backdrop-blur">
      {loading && (
        <div className="flex items-center gap-2 text-sm text-chalk-300">
          <span className="h-2 w-2 animate-ping rounded-full bg-gps-blue" />
          Calculando a melhor rota...
        </div>
      )}

      {!loading && error && (
        <div className="space-y-2">
          <p className="text-sm text-signal-red">{error}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="text-xs font-semibold text-gps-blue underline"
            >
              Tentar novamente
            </button>
          )}
        </div>
      )}

      {!loading && !error && route && (
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-display text-lg tracking-wide text-chalk-100">
              {route.distanceKm < 1
                ? `${Math.round(route.distanceKm * 1000)} m`
                : `${route.distanceKm.toFixed(1).replace('.', ',')} km`}
            </p>
            <p className="text-xs text-chalk-500">~ {formatDuration(route.durationMin)} de carro</p>
          </div>
          <span className="text-2xl">🚗</span>
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <a
          href={links.googleMaps}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 rounded-lg bg-gps-blue px-3 py-2 text-center text-xs font-bold text-ink-950"
        >
          Google Maps
        </a>
        <a
          href={links.waze}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 rounded-lg border border-ink-600 px-3 py-2 text-center text-xs font-bold text-chalk-100"
        >
          Waze
        </a>
        <a
          href={links.appleMaps}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 rounded-lg border border-ink-600 px-3 py-2 text-center text-xs font-bold text-chalk-100"
        >
          Apple Maps
        </a>
      </div>
    </div>
  );
}
