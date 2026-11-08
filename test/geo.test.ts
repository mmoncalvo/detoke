import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { initDb } from '../server/db.js';
import { clearGeoCache } from '../server/services/geo.js';
import { app, request } from './helpers.js';

const json = (body: unknown) => Promise.resolve(new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } }));

const georef = {
  localidades: [
    { nombre: 'Cordón del Plata', provincia: { nombre: 'Mendoza' }, centroide: { lat: -33.46, lon: -69.14 } },
    { nombre: 'Córdoba', provincia: { nombre: 'Córdoba' }, centroide: { lat: -31.415, lon: -64.179 } },
    { nombre: 'Córdoba', provincia: { nombre: 'Córdoba' }, centroide: { lat: -31.416, lon: -64.183 } },
    { nombre: 'Palermo', provincia: { nombre: 'Ciudad Autónoma de Buenos Aires' }, centroide: { lat: -34.58, lon: -58.42 } },
  ],
};
const photonCities = {
  features: [
    { geometry: { coordinates: [-56.19, -34.9] }, properties: { name: 'Córdoba', country: 'Uruguay', state: 'Montevideo' } },
    { geometry: { coordinates: [2.3, 48.8] }, properties: { name: 'Cordes', country: 'France', state: 'Occitanie' } },
  ],
};
const house = {
  geometry: { coordinates: [-58.4412, -34.6188] },
  properties: { street: 'Yerbal', housenumber: '719', district: 'Caballito', state: 'Ciudad Autónoma de Buenos Aires', country: 'Argentina', postcode: 'C1424CEI', type: 'house' },
};

let fetchMock: ReturnType<typeof vi.fn>;

beforeAll(async () => {
  await initDb({ reset: true });
});

beforeEach(() => {
  clearGeoCache();
  fetchMock = vi.fn((url: string) => {
    if (url.includes('georef')) return json(georef);
    if (url.includes('/reverse')) return json({ features: [house] });
    if (url.includes('layer=city')) return json(photonCities);
    return json({ features: [house, { geometry: { coordinates: [-58.44, -34.62] }, properties: { name: 'Yerbal', type: 'street', district: 'Caballito', state: 'Ciudad Autónoma de Buenos Aires', country: 'Argentina' } }] });
  });
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => vi.unstubAllGlobals());

describe('geo', () => {
  it('lists cities with their province, Uruguay first among equal matches, without duplicates', async () => {
    const res = await request(app).get('/api/geo/cities').query({ q: 'cordo' });
    expect(res.status).toBe(200);
    const labels = res.body.data.map((c: { label: string }) => c.label);
    expect(labels[0]).toBe('Córdoba, Montevideo');
    expect(labels[1]).toBe('Córdoba, Córdoba, Argentina');
    expect(labels.filter((l: string) => l === 'Córdoba, Córdoba, Argentina')).toHaveLength(1);
    expect(labels.some((l: string) => l.includes('France'))).toBe(false);

    const barrio = res.body.data.find((c: { neighborhood: string | null }) => c.neighborhood === 'Palermo');
    expect(barrio).toMatchObject({ city: 'Ciudad de Buenos Aires', province: 'Ciudad Autónoma de Buenos Aires', label: 'Palermo, Ciudad de Buenos Aires, Argentina' });

    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers['User-Agent']).toMatch(/^Detoke\/1\.0 \(/);
  });

  it('searches addresses near the city and keeps the typed number for streets', async () => {
    const res = await request(app).get('/api/geo/addresses').query({ q: 'yerbal 700', lat: -34.6, lng: -58.44 });
    expect(res.body.data[0]).toMatchObject({ address: 'Yerbal 719', neighborhood: 'Caballito', city: 'Ciudad de Buenos Aires', postalCode: 'C1424CEI' });
    expect(res.body.data[1].address).toBe('Yerbal 700');
    const url = new URL(fetchMock.mock.calls[0][0]);
    expect(url.searchParams.get('bbox')).toBe('-58.74,-34.9,-58.14,-34.3');
  });

  it('reverse geocodes a point and keeps the exact coordinates', async () => {
    const res = await request(app).get('/api/geo/reverse').query({ lat: -34.6186, lng: -58.4412 });
    expect(res.body.data).toMatchObject({ address: 'Yerbal 719', neighborhood: 'Caballito', city: 'Ciudad de Buenos Aires', latitude: -34.6186, longitude: -58.4412 });
  });

  it('caches repeated lookups', async () => {
    await request(app).get('/api/geo/reverse').query({ lat: -34.6, lng: -58.4 });
    await request(app).get('/api/geo/reverse').query({ lat: -34.6, lng: -58.4 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('skips short queries and validates points', async () => {
    expect((await request(app).get('/api/geo/cities').query({ q: 'c' })).body.data).toEqual([]);
    expect((await request(app).get('/api/geo/addresses').query({ q: 'ye' })).body.data).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
    const bad = await request(app).get('/api/geo/reverse').query({ lat: 200, lng: 0 });
    expect(bad.status).toBe(400);
    expect(bad.body.error).toBe('Ubicación inválida');
  });

  it('answers in Spanish when the services fail or time out', async () => {
    fetchMock.mockImplementation(() => Promise.reject(Object.assign(new Error('aborted'), { name: 'AbortError' })));
    const reverse = await request(app).get('/api/geo/reverse').query({ lat: -34.5, lng: -58.5 });
    expect(reverse.status).toBe(502);
    expect(reverse.body.error).toBe('No pudimos consultar el mapa. Podés completar los datos a mano.');

    fetchMock.mockImplementation(() => Promise.resolve(new Response('error', { status: 503 })));
    expect((await request(app).get('/api/geo/cities').query({ q: 'rosario' })).status).toBe(502);
  });

  it('still lists cities when one of the two services fails', async () => {
    fetchMock.mockImplementation((url: string) => (url.includes('georef') ? Promise.reject(new Error('down')) : json(photonCities)));
    const res = await request(app).get('/api/geo/cities').query({ q: 'cordoba' });
    expect(res.status).toBe(200);
    expect(res.body.data.map((c: { label: string }) => c.label)).toEqual(['Córdoba, Montevideo']);
  });
});
