import { useCallback, useEffect, useRef, useState } from 'react';

interface GeoState {
  coords: [number, number] | null;
  /** Raio de precisão em metros informado pelo dispositivo. */
  accuracy: number | null;
  status: 'idle' | 'loading' | 'granted' | 'denied' | 'unsupported' | 'timeout';
  error?: string;
  /** Se o navegador está atualizando a posição continuamente (modo "ao vivo"). */
  watching: boolean;
}

function friendlyError(err: GeolocationPositionError): { status: GeoState['status']; message: string } {
  switch (err.code) {
    case err.PERMISSION_DENIED:
      return {
        status: 'denied',
        message: 'Você não permitiu o acesso à localização. Ative nas permissões do navegador ou marque o ponto manualmente no mapa.',
      };
    case err.POSITION_UNAVAILABLE:
      return { status: 'denied', message: 'Não conseguimos determinar sua localização agora.' };
    case err.TIMEOUT:
      return { status: 'timeout', message: 'A localização demorou demais para responder. Tente de novo.' };
    default:
      return { status: 'denied', message: 'Não foi possível obter sua localização.' };
  }
}

export function useGeolocation() {
  const [state, setState] = useState<GeoState>({
    coords: null,
    accuracy: null,
    status: 'idle',
    watching: false,
  });
  const watchId = useRef<number | null>(null);

  const stopWatching = useCallback(() => {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    setState((s) => ({ ...s, watching: false }));
  }, []);

  /** Pede a localização uma única vez (mais rápido e suficiente para a maioria dos casos). */
  const request = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setState((s) => ({ ...s, coords: null, status: 'unsupported', error: 'Geolocalização não suportada neste navegador.' }));
      return;
    }
    setState((s) => ({ ...s, status: 'loading', error: undefined }));
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setState((s) => ({
          ...s,
          coords: [pos.coords.latitude, pos.coords.longitude],
          accuracy: pos.coords.accuracy,
          status: 'granted',
          error: undefined,
        }));
      },
      (err) => {
        const { status, message } = friendlyError(err);
        setState((s) => ({ ...s, coords: null, status, error: message }));
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 30_000 }
    );
  }, []);

  /** Liga o rastreamento contínuo (bolinha "ao vivo" se movendo no mapa). */
  const startWatching = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setState((s) => ({ ...s, status: 'unsupported', error: 'Geolocalização não suportada neste navegador.' }));
      return;
    }
    setState((s) => ({ ...s, status: 'loading', watching: true, error: undefined }));
    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        setState((s) => ({
          ...s,
          coords: [pos.coords.latitude, pos.coords.longitude],
          accuracy: pos.coords.accuracy,
          status: 'granted',
          watching: true,
          error: undefined,
        }));
      },
      (err) => {
        const { status, message } = friendlyError(err);
        setState((s) => ({ ...s, status, error: message, watching: false }));
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 5_000 }
    );
  }, []);

  useEffect(() => stopWatching, [stopWatching]);

  return { ...state, request, startWatching, stopWatching };
}
