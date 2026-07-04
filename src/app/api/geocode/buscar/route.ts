import { NextResponse } from "next/server";

// Búsqueda con varios resultados (a diferencia de /api/geocode, que devuelve solo 1)
// para el buscador con mapa: el usuario escribe, ve una lista de coincidencias, y
// elige la correcta antes de confirmar el pin. Mismo proveedor (Nominatim/OSM),
// mismo User-Agent requerido por su política de uso.
const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const USER_AGENT = "ConcaribeTracker/1.0 (contacto: soporte@concaribe.com)";

export interface ResultadoBusqueda {
  direccion: string;
  lat: number;
  lng: number;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");

  if (!q || q.trim().length < 3) {
    return NextResponse.json({ resultados: [] });
  }

  const params = new URLSearchParams({ q, format: "jsonv2", limit: "5" });
  const res = await fetch(`${NOMINATIM_URL}?${params}`, { headers: { "User-Agent": USER_AGENT } });

  if (!res.ok) return NextResponse.json({ resultados: [] });

  const data = await res.json();
  const resultados: ResultadoBusqueda[] = (Array.isArray(data) ? data : []).map((r: any) => ({
    direccion: r.display_name,
    lat: parseFloat(r.lat),
    lng: parseFloat(r.lon),
  }));

  return NextResponse.json({ resultados });
}
