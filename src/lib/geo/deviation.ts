import { point, lineString } from "@turf/helpers";
import pointToLineDistance from "@turf/point-to-line-distance";
import nearestPointOnLine from "@turf/nearest-point-on-line";
import type { Feature, LineString, Point } from "geojson";
import { UMBRAL_DESVIO_METROS } from "@/lib/constants";

export { UMBRAL_DESVIO_METROS };

export interface ResultadoDesvio {
  desviado: boolean;
  distanciaMetros: number;
  puntoMasCercano: [number, number];
}

/** Decodifica un encoded polyline de Google a un array de [lat, lng]. */
export function decodePolyline(encoded: string): [number, number][] {
  let index = 0,
    lat = 0,
    lng = 0;
  const coordinates: [number, number][] = [];

  while (index < encoded.length) {
    let shift = 0,
      result = 0,
      byte: number;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lat += (result & 1) !== 0 ? ~(result >> 1) : result >> 1;

    shift = 0;
    result = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lng += (result & 1) !== 0 ? ~(result >> 1) : result >> 1;

    coordinates.push([lat / 1e5, lng / 1e5]);
  }
  return coordinates;
}

/**
 * Calcula si la posición actual del vendedor está desviada respecto a la
 * polyline confirmada de la ruta (rutas.polyline), usando turf.js.
 */
export function calcularDesvio(
  posicionActual: [number, number],
  polylineEncoded: string,
  umbralMetros: number = UMBRAL_DESVIO_METROS
): ResultadoDesvio {
  const puntosRuta = decodePolyline(polylineEncoded);

  if (puntosRuta.length < 2) {
    return { desviado: false, distanciaMetros: 0, puntoMasCercano: [posicionActual[1], posicionActual[0]] };
  }

  const linea: Feature<LineString> = lineString(puntosRuta.map(([lat, lng]) => [lng, lat]));
  const pt: Feature<Point> = point([posicionActual[1], posicionActual[0]]);

  const distanciaMetros = pointToLineDistance(pt, linea, { units: "meters" });
  const puntoCercano = nearestPointOnLine(linea, pt, { units: "meters" });

  return {
    desviado: distanciaMetros > umbralMetros,
    distanciaMetros: Math.round(distanciaMetros * 100) / 100,
    puntoMasCercano: puntoCercano.geometry.coordinates as [number, number],
  };
}
