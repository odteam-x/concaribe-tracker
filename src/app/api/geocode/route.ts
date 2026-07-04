import { NextResponse } from "next/server";
import { geocodificarDireccion } from "@/lib/osm/geocode";

// Proxy server-side hacia Nominatim (OpenStreetMap) — evita llamar directo desde el
// cliente para respetar el límite de 1 request/segundo y el User-Agent requerido.
export async function POST(req: Request) {
  const { direccion } = await req.json();
  if (!direccion || typeof direccion !== "string") {
    return NextResponse.json({ error: "Falta el campo 'direccion'" }, { status: 400 });
  }

  const resultado = await geocodificarDireccion(direccion);
  if (!resultado) {
    return NextResponse.json({ error: "No se pudo geocodificar la dirección" }, { status: 422 });
  }

  return NextResponse.json(resultado);
}
