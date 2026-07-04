import { NextResponse } from "next/server";
import { calcularRutaOptima, generarPolylineParaOrden, type PuntoRuta } from "@/lib/osm/routing";

// Server-side: llama al servidor demo público de OSRM. Se mantiene como Route Handler
// (en vez de llamar directo desde el cliente) para poder cambiar de proveedor a futuro
// sin tocar el frontend.
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
