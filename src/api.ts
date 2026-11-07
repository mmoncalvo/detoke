// Cliente de la API. Mismo origen salvo que VITE_API_URL apunte a otro servidor.
import type { ApiResponse } from '@shared/types';

const BASE: string = import.meta.env.VITE_API_URL ?? '';
const API_URL = `${BASE}/api`;
/** Prefijo de las imágenes en /data. */
export const BASE_URL = BASE;

export const api = {
  async get(endpoint: string, token?: string): Promise<ApiResponse> {
    const res = await fetch(`${API_URL}${endpoint}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    return res.json();
  },

  async post(endpoint: string, data: any, token?: string): Promise<ApiResponse> {
    const res = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` })
      },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async put(endpoint: string, data: any, token?: string): Promise<ApiResponse> {
    const res = await fetch(`${API_URL}${endpoint}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` })
      },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async delete(endpoint: string, token?: string): Promise<ApiResponse> {
    const res = await fetch(`${API_URL}${endpoint}`, {
      method: 'DELETE',
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    return res.json();
  },

  async upload(endpoint: string, formData: FormData, token?: string): Promise<ApiResponse> {
    const res = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData
    });
    return res.json();
  }
};

export const whatsappLink = (phone: string, message?: string) => {
  const base = `https://wa.me/${phone.replace(/\D/g, '')}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
};
