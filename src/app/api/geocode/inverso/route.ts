import { NextResponse } from "next/server";

// Geocodificación inversa (lat/lng -> dirección legible) vía Nominatim. Se usa cuando
// el vendedor coloca el pin a mano en el mapa (arrastrando o haciendo clic) en vez de
// elegir un resultado de búsqueda por nombre — común porque Nominatim/OSM no es un
// directorio de negocios, muchos locales pequeños simplemente no están indexados ahí.
const NOMINATIM_URL = "https://nominatim.openstreetmap.org/reverse";
const USER_AGENT = "ConcaribeTracker/1.0 (contacto: soporte@concaribe.com)";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");

  if (!lat || !lng) {
    return NextResponse.json({ error: "Faltan lat/lng" }, { status: 400 });
  }

  const params = new URLSearchParams({ lat, lon: lng, format: "jsonv2" });
  const res = await fetch(`${NOMINATIM_URL}?${params}`, { headers: { "User-Agent": USER_AGENT } });

  if (!res.ok) return NextResponse.json({ direccion: null });

  const data = await res.json();
  return NextResponse.json({ direccion: data.display_name ?? null });
}
