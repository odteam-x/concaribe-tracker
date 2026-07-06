import { NextResponse } from "next/server";
import { geocodificarInverso } from "@/lib/google/geocode";

// Geocodificación inversa (lat/lng -> dirección legible) vía Google Geocoding API.
// Se usa cuando el vendedor coloca el pin a mano en el mapa (arrastrando o haciendo
// clic) en vez de elegir un resultado de búsqueda por nombre.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");

  if (!lat || !lng) {
    return NextResponse.json({ error: "Faltan lat/lng" }, { status: 400 });
  }

  const direccion = await geocodificarInverso(parseFloat(lat), parseFloat(lng));
  return NextResponse.json({ direccion });
}
