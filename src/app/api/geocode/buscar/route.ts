import { NextResponse } from "next/server";
import { buscarLugares, type ResultadoBusquedaPlaces } from "@/lib/google/places";

export type ResultadoBusqueda = ResultadoBusquedaPlaces;

// Búsqueda con varios resultados (a diferencia de /api/geocode, que devuelve solo 1):
// el usuario escribe, ve una lista de coincidencias, y elige la correcta antes de
// confirmar el pin. Vía Places API (Text Search) — sí tiene negocios pequeños
// registrados, a diferencia de Nominatim/OSM.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");

  if (!q || q.trim().length < 3) {
    return NextResponse.json({ resultados: [] });
  }

  const resultados = await buscarLugares(q);
  return NextResponse.json({ resultados });
}
