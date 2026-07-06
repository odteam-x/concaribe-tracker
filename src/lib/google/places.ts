// Búsqueda de negocios/locales por nombre vía Places API (Text Search) — a
// diferencia de Nominatim/OSM, sí tiene la mayoría de negocios pequeños
// registrados (los dueños se dan de alta directo en Google Business).
// Server-side only, usa GOOGLE_MAPS_SERVER_API_KEY. Restringido a República Dominicana.
export interface ResultadoBusquedaPlaces {
  direccion: string;
  lat: number;
  lng: number;
  nombre?: string;
}

// Centro aproximado de RD + radio que cubre todo el país, para sesgar la búsqueda.
const RD_CENTRO = "18.7357,-70.1627";
const RD_RADIO_METROS = "200000";

export async function buscarLugares(query: string): Promise<ResultadoBusquedaPlaces[]> {
  const key = process.env.GOOGLE_MAPS_SERVER_API_KEY;
  if (!key) throw new Error("Falta GOOGLE_MAPS_SERVER_API_KEY en el servidor");

  const params = new URLSearchParams({
    query,
    region: "do",
    location: RD_CENTRO,
    radius: RD_RADIO_METROS,
    key,
  });

  const res = await fetch(`https://maps.googleapis.com/maps/api/place/textsearch/json?${params}`);
  const data = await res.json();

  if (data.status !== "OK" || !Array.isArray(data.results)) return [];

  return data.results
    // Filtra a resultados dentro de República Dominicana (Text Search sesga pero no
    // filtra estrictamente por país; descartamos lo que quede fuera del bounding box).
    .filter((r: any) => {
      const lat = r.geometry?.location?.lat;
      const lng = r.geometry?.location?.lng;
      return lat >= 17.3 && lat <= 20.1 && lng >= -72.1 && lng <= -68.2;
    })
    .slice(0, 5)
    .map((r: any) => ({
      direccion: r.formatted_address ?? r.name,
      nombre: r.name,
      lat: r.geometry.location.lat,
      lng: r.geometry.location.lng,
    }));
}
