import { point } from "@turf/helpers";
import distance from "@turf/distance";
import { RADIO_LLEGADA_METROS_DEFAULT } from "@/lib/constants";

export { RADIO_LLEGADA_METROS_DEFAULT };

export interface EmpresaConGeofence {
  id: string;
  nombre: string;
  lat: number;
  lng: number;
  radioMetros?: number;
  yaVisitado: boolean;
}

export interface DeteccionLlegada {
  empresaId: string;
  nombre: string;
  distanciaMetros: number;
}

/**
 * Evalúa la posición actual contra las empresas pendientes de la ruta activa
 * y retorna aquellas dentro del radio de geofence (candidatas a "llegada automática").
 * Se llama en cada tick de tracking GPS (cada 60s).
 */
export function detectarLlegadas(
  posicionActual: [number, number],
  empresas: EmpresaConGeofence[]
): DeteccionLlegada[] {
  const pt = point([posicionActual[1], posicionActual[0]]);

  return empresas
    .filter((e) => !e.yaVisitado)
    .map((e) => ({
      empresaId: e.id,
      nombre: e.nombre,
      distanciaMetros: distance(pt, point([e.lng, e.lat]), { units: "meters" }),
      radioMetros: e.radioMetros ?? RADIO_LLEGADA_METROS_DEFAULT,
    }))
    .filter((d) => d.distanciaMetros <= d.radioMetros)
    .map(({ empresaId, nombre, distanciaMetros }) => ({ empresaId, nombre, distanciaMetros }));
}
