import { useEffect, useState } from 'react';

/** Retrasa la propagación de un valor (usado en la búsqueda en tiempo real). */
export function useDebounce(valor, delayMs = 350) {
  const [valorDebounced, setValorDebounced] = useState(valor);

  useEffect(() => {
    const timeout = setTimeout(() => setValorDebounced(valor), delayMs);
    return () => clearTimeout(timeout);
  }, [valor, delayMs]);

  return valorDebounced;
}
