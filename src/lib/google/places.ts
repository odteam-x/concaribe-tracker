// Búsqueda de negocios/locales por nombre vía Places API (Text Search) — a
// diferencia de Nominatim/OSM, sí tiene la mayoría de negocios pequeños
// registrados (los dueños se dan de alta directo en Google Business).
// Server-side only, usa GOOGLE_MAPS_SERVER_API_KEY.
export interface ResultadoBusquedaPlaces {
  direccion: string;
  lat: number;
  lng: number;
  nombre?: string;
}

export async function buscarLugares(query: string): Promise<ResultadoBusquedaPlaces[]> {
  const params = new URLSearchParams({
    query,
    key: process.env.GOOGLE_MAPS_SERVER_API_KEY!,
  });

  const res = await fetch(`https://maps.googleapis.com/maps/api/place/textsearch/json?${params}`);
  const data = await res.json();

  if (data.status !== "OK" || !Array.isArray(data.results)) return [];

  return data.results.slice(0, 5).map((r: any) => ({
    direccion: r.formatted_address ?? r.name,
    nombre: r.name,
    lat: r.geometry.location.lat,
    lng: r.geometry.location.lng,
  }));
}
