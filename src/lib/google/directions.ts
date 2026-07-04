// Server-side only: usa GOOGLE_MAPS_SERVER_API_KEY. Se invoca desde
// api/rutas/optimizar/route.ts al confirmar la selección de empresas en "Iniciar ruta".
export interface PuntoRuta {
  empresaId: string;
  lat: number;
  lng: number;
}

export interface RutaOptimizada {
  ordenSugerido: string[]; // empresa_id en el orden que Google sugiere
  polylineSugerido: string;
}

/**
 * Llama a Directions API con optimizeWaypoints=true para obtener el orden
 * sugerido de visita. El origen y destino son la posición actual del vendedor
 * (recorrido de ida y vuelta) — solo se usa como referencia; el vendedor puede
 * ignorarlo y reordenar manualmente antes de confirmar.
 */
export async function calcularRutaOptima(
  origen: { lat: number; lng: number },
  puntos: PuntoRuta[]
): Promise<RutaOptimizada> {
  if (puntos.length === 0) {
    throw new Error("Se requiere al menos una empresa para calcular la ruta");
  }

  const waypoints = puntos.map((p) => `${p.lat},${p.lng}`).join("|");

  const params = new URLSearchParams({
    origin: `${origen.lat},${origen.lng}`,
    destination: `${origen.lat},${origen.lng}`,
    waypoints: `optimize:true|${waypoints}`,
    key: process.env.GOOGLE_MAPS_SERVER_API_KEY!,
  });

  const res = await fetch(`https://maps.googleapis.com/maps/api/directions/json?${params}`);
  const data = await res.json();

  if (data.status !== "OK") throw new Error(`Directions API error: ${data.status}`);

  const waypointOrder: number[] = data.routes[0].waypoint_order;
  const ordenSugerido = waypointOrder.map((i) => puntos[i].empresaId);

  return { ordenSugerido, polylineSugerido: data.routes[0].overview_polyline.points };
}

/**
 * Regenera el polyline final para el orden que el vendedor confirmó manualmente
 * (sin optimizeWaypoints: el orden ya está decidido, solo se traza la ruta).
 * Este es el polyline que se guarda en rutas.polyline y se usa para calcularDesvio().
 */
export async function generarPolylineParaOrden(
  origen: { lat: number; lng: number },
  puntosEnOrden: PuntoRuta[]
): Promise<string> {
  if (puntosEnOrden.length === 0) {
    throw new Error("Se requiere al menos una empresa para generar el polyline");
  }

  const intermedios = puntosEnOrden.slice(0, -1);
  const ultimo = puntosEnOrden[puntosEnOrden.length - 1];

  const params = new URLSearchParams({
    origin: `${origen.lat},${origen.lng}`,
    destination: `${ultimo.lat},${ultimo.lng}`,
    key: process.env.GOOGLE_MAPS_SERVER_API_KEY!,
  });
  if (intermedios.length > 0) {
    params.set("waypoints", intermedios.map((p) => `${p.lat},${p.lng}`).join("|"));
  }

  const res = await fetch(`https://maps.googleapis.com/maps/api/directions/json?${params}`);
  const data = await res.json();
  if (data.status !== "OK") throw new Error(`Directions API error: ${data.status}`);
  return data.routes[0].overview_polyline.points;
}
