// Places returned by the geocoding endpoints (/api/geo).

export interface CityOption {
  /** Stable key for lists. */
  id: string;
  /** Ready to show: "Córdoba, Córdoba" or "Palermo, Ciudad de Buenos Aires". */
  label: string;
  city: string;
  province: string;
  country: string;
  /** Set when the option is a neighborhood of a city (Buenos Aires lists its barrios as localities). */
  neighborhood: string | null;
  latitude: number;
  longitude: number;
}

export interface AddressOption {
  id: string;
  label: string;
  /** Street and number, as stored in the business. */
  address: string;
  neighborhood: string | null;
  city: string | null;
  province: string | null;
  postalCode: string | null;
  country: string | null;
  latitude: number;
  longitude: number;
}
