import { useCallback, useState } from 'react';
import { fetchRoute, type RouteProfile, type RouteResult } from '../utils/routing';

interface RouteState {
  data: RouteResult | null;
  status: 'idle' | 'loading' | 'success' | 'error';
  error?: string;
}

export function useRoute() {
  const [state, setState] = useState<RouteState>({ data: null, status: 'idle' });

  const calculate = useCallback(
    async (from: [number, number], to: [number, number], profile: RouteProfile = 'driving') => {
      setState({ data: null, status: 'loading' });
      try {
        const result = await fetchRoute(from, to, profile);
        setState({ data: result, status: 'success' });
      } catch (err) {
        setState({
          data: null,
          status: 'error',
          error: err instanceof Error ? err.message : 'Não foi possível calcular a rota.',
        });
      }
    },
    []
  );

  const clear = useCallback(() => setState({ data: null, status: 'idle' }), []);

  return { ...state, calculate, clear };
}
