// Ruteo y optimización de orden de visita vía OSRM (Open Source Routing Machine) —
// servidor demo público, gratis, sin API key ni tarjeta: https://router.project-osrm.org
// OSRM devuelve geometrías en el mismo formato "encoded polyline" (precisión 5) que
// Google Directions, así que decodePolyline() en src/lib/geo/deviation.ts no cambia.
const OSRM_BASE_URL = "https://router.project-osrm.org";

export interface PuntoRuta {
  empresaId: string;
  lat: number;
  lng: number;
}

export interface RutaOptimizada {
  ordenSugerido: string[]; // empresa_id en el orden que OSRM sugiere
  polylineSugerido: string;
}

/**
 * Llama al servicio "trip" de OSRM (resuelve el problema del viajante) para obtener
 * el orden sugerido de visita, partiendo siempre de la posición actual del vendedor
 * (source=first) y sin punto de destino fijo (destination=any). Solo referencia:
 * el vendedor puede ignorarlo y reordenar manualmente antes de confirmar.
 */
export async function calcularRutaOptima(
  origen: { lat: number; lng: number },
  puntos: PuntoRuta[]
): Promise<RutaOptimizada> {
  if (puntos.length === 0) {
    throw new Error("Se requiere al menos una empresa para calcular la ruta");
  }

  const coords = [origen, ...puntos].map((p) => `${p.lng},${p.lat}`).join(";");
  const params = new URLSearchParams({
    source: "first",
    destination: "any",
    roundtrip: "false",
    geometries: "polyline",
    overview: "full",
  });

  const res = await fetch(`${OSRM_BASE_URL}/trip/v1/driving/${coords}?${params}`);
  const data = await res.json();

  if (data.code !== "Ok") throw new Error(`OSRM trip error: ${data.code}`);

  // data.waypoints viene en el mismo orden de entrada (origen + puntos); cada uno
  // trae waypoint_index = su posición dentro del recorrido ya optimizado.
  const waypointsSinOrigen = data.waypoints.slice(1) as { waypoint_index: number }[];
  const ordenSugerido = puntos
    .map((p, i) => ({ empresaId: p.empresaId, waypointIndex: waypointsSinOrigen[i].waypoint_index }))
    .sort((a, b) => a.waypointIndex - b.waypointIndex)
    .map((x) => x.empresaId);

  return { ordenSugerido, polylineSugerido: data.trips[0].geometry };
}

/**
 * Regenera el polyline final para el orden que el vendedor confirmó manualmente
 * (servicio "route" de OSRM: sigue la secuencia de puntos tal cual, sin optimizar).
 * Este es el polyline que se guarda en rutas.polyline y se usa para calcularDesvio().
 */
export async function generarPolylineParaOrden(
  origen: { lat: number; lng: number },
  puntosEnOrden: PuntoRuta[]
): Promise<string> {
  if (puntosEnOrden.length === 0) {
    throw new Error("Se requiere al menos una empresa para generar el polyline");
  }

  const coords = [origen, ...puntosEnOrden].map((p) => `${p.lng},${p.lat}`).join(";");
  const params = new URLSearchParams({ geometries: "polyline", overview: "full" });

  const res = await fetch(`${OSRM_BASE_URL}/route/v1/driving/${coords}?${params}`);
  const data = await res.json();
  if (data.code !== "Ok") throw new Error(`OSRM route error: ${data.code}`);
  return data.routes[0].geometry;
}
