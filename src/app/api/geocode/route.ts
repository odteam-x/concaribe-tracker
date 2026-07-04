import { NextResponse } from "next/server";
import { geocodificarDireccion } from "@/lib/google/geocode";

// Proxy server-side: usa GOOGLE_MAPS_SERVER_API_KEY (key privada, sin restricción
// de HTTP referrer). El cliente nunca llama directo a Geocoding API.
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
