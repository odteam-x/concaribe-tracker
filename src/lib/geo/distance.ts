import { lineString } from "@turf/helpers";
import length from "@turf/length";

/**
 * Calcula la distancia total recorrida (km) a partir de una secuencia ordenada
 * de posiciones GPS del día. Usado como fallback client-side del cálculo que,
 * server-side, hace la vista materializada mv_metricas_diarias (ST_Length sobre
 * ST_MakeLine) — útil para mostrar el km recorrido "en vivo" antes de sincronizar.
 */
export function calcularKmRecorridos(puntos: [number, number][]): number {
  if (puntos.length < 2) return 0;
  const linea = lineString(puntos.map(([lat, lng]) => [lng, lat]));
  return Math.round(length(linea, { units: "kilometers" }) * 100) / 100;
}
