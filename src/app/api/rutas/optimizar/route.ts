import { NextResponse } from "next/server";
import { calcularRutaOptima, generarPolylineParaOrden, type PuntoRuta } from "@/lib/google/directions";

// Server-side: usa GOOGLE_MAPS_SERVER_API_KEY (key privada). El cliente nunca llama
// directo a Directions API, siempre pasa por este Route Handler.
export async function POST(req: Request) {
  const body = await req.json();
  const { origen, puntos, ordenManual } = body as {
    origen: { lat: number; lng: number };
    puntos: PuntoRuta[];
    ordenManual?: string[]; // si el vendedor ya reordenó manualmente, se regenera el polyline sobre este orden
  };

  try {
    if (ordenManual) {
      const puntosPorId = new Map(puntos.map((p) => [p.empresaId, p]));
      const puntosEnOrden = ordenManual.map((id) => puntosPorId.get(id)!).filter(Boolean);
      const polyline = await generarPolylineParaOrden(origen, puntosEnOrden);
      return NextResponse.json({ polyline });
    }

    const resultado = await calcularRutaOptima(origen, puntos);
    return NextResponse.json(resultado);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 502 });
  }
}
