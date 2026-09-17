import { useEffect, useState } from 'react';

/** Retorna a data/hora atual, atualizada a cada 60s para manter estados "ao vivo" corretos. */
export function useNow(intervalMs = 60_000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
