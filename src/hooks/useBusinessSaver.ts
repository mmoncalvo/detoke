import { useCallback } from 'react';
import { toast } from 'sonner';
import type { Business } from '@shared/types';
import { api } from '@/api';
import { useAuth } from '@/context/AuthContext';

/** Calls that change the session user's business and keep the session in sync. */
export function useBusinessSaver() {
  const { setBusiness } = useAuth();

  const save = useCallback(async (data: object, message = 'Cambios guardados') => {
    try {
      setBusiness(await api<Business>('/businesses/me', { method: 'PUT', body: data }));
      if (message) toast.success(message);
      return true;
    } catch (err) {
      toast.error((err as Error).message);
      return false;
    }
  }, [setBusiness]);

  const uploadImage = useCallback(async (route: 'logo' | 'cover', file: File) => {
    const body = new FormData();
    body.append('image', file);
    setBusiness(await api<Business>(`/businesses/me/${route}`, { method: 'POST', body }));
  }, [setBusiness]);

  return { save, uploadImage };
}
