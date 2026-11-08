import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

function readStored(key: string | undefined) {
  if (!key) return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStored(key: string | undefined, value: string) {
  if (!key) return;
  try {
    localStorage.setItem(key, value);
  } catch {
    /* storage not available */
  }
}

/**
 * A value kept in the URL query (like Explorar does), so reloading or going back keeps it.
 * The default is left out of the URL. With `persist` (a `detoke.*` localStorage key), the last choice is also saved in the
 * browser and used when the URL does not say, so it is still there when the user comes back.
 */
export function useUrlState(key: string, fallback: string, { persist: storageKey, allowed }: { persist?: string; allowed?: readonly string[] } = {}): [string, (value: string) => void] {
  const [params, setParams] = useSearchParams();
  const stored = readStored(storageKey);
  // A stale or tampered saved value falls back to the default.
  const value = params.get(key) ?? (stored && (!allowed || allowed.includes(stored)) ? stored : null) ?? fallback;

  const setValue = useCallback((next: string) => {
    writeStored(storageKey, next || fallback);
    setParams((current) => {
      const updated = new URLSearchParams(current);
      if (!next || next === fallback) updated.delete(key);
      else updated.set(key, next);
      return updated;
    }, { replace: true });
  }, [key, fallback, storageKey, setParams]);

  return [value, setValue];
}
