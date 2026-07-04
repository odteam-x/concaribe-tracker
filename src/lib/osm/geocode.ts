// Geocodificación vía Nominatim (OpenStreetMap) — gratis, sin API key ni tarjeta.
// Política de uso de Nominatim (https://operations.osmfoundation.org/policies/nominatim/):
// máximo 1 request/segundo y un User-Agent identificando la app. Server-side only
// (Route Handler api/geocode/route.ts), nunca se llama directo desde el cliente.
const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const USER_AGENT = "ConcaribeTracker/1.0 (contacto: soporte@concaribe.com)";

export interface ResultadoGeocode {
  direccionFormateada: string;
  lat: number;
  lng: number;
}

export async function geocodificarDireccion(direccion: string): Promise<ResultadoGeocode | null> {
  const params = new URLSearchParams({
    q: direccion,
    format: "jsonv2",
    limit: "1",
  });

  const res = await fetch(`${NOMINATIM_URL}?${params}`, {
    headers: { "User-Agent": USER_AGENT },
  });

  if (!res.ok) return null;
  const data = await res.json();
  if (!Array.isArray(data) || data.length === 0) return null;

  const resultado = data[0];
  return {
    direccionFormateada: resultado.display_name,
    lat: parseFloat(resultado.lat),
    lng: parseFloat(resultado.lon),
  };
}
