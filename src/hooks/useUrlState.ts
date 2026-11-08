import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * A value kept in the URL query (like Explorar does), so reloading or going back keeps it.
 * The default is left out of the URL.
 */
export function useUrlState(key: string, fallback: string): [string, (value: string) => void] {
  const [params, setParams] = useSearchParams();
  const value = params.get(key) ?? fallback;

  const setValue = useCallback((next: string) => {
    setParams((current) => {
      const updated = new URLSearchParams(current);
      if (!next || next === fallback) updated.delete(key);
      else updated.set(key, next);
      return updated;
    }, { replace: true });
  }, [key, fallback, setParams]);

  return [value, setValue];
}
