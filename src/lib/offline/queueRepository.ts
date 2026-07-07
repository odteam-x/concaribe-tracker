import { db, type UbicacionLocal, type DesvioLocal, type VisitaLocal } from "./db";
import { ejecutarSync } from "./syncEngine";

export async function queueUbicacion(u: Omit<UbicacionLocal, "intentos">) {
  await db.ubicaciones.put({ ...u, intentos: 0 });
  if (navigator.onLine) void ejecutarSync();
}

export async function queueDesvio(d: Omit<DesvioLocal, "intentos">) {
  await db.desvios.put({ ...d, intentos: 0 });
  if (navigator.onLine) void ejecutarSync();
}

export async function queueVisita(v: Omit<VisitaLocal, "intentos">) {
  await db.visitas.put({ ...v, intentos: 0 });
  if (navigator.onLine) void ejecutarSync();
}

/** Completa el motivo de un desvío ya encolado (mientras siga sin sincronizar). */
export async function completarMotivoDesvioLocal(clientUuid: string, motivo: string) {
  await db.desvios.update(clientUuid, { motivo });
  if (navigator.onLine) void ejecutarSync();
}

/** empresa_id de las visitas guardadas localmente para una ruta (sincronizadas o no),
 *  para que el contador de progreso las refleje de inmediato sin esperar al sync. */
export async function empresasVisitadasLocal(rutaId: string): Promise<string[]> {
  // rutaId no está indexado en Dexie, así que se filtra en memoria (el volumen local
  // de visitas de una jornada es pequeño).
  const visitas = await db.visitas.toArray();
  return visitas.filter((v) => v.rutaId === rutaId).map((v) => v.empresaId);
}

export async function contarPendientes(): Promise<number> {
  const [u, d, v] = await Promise.all([
    db.ubicaciones.where("sincronizado").equals(0).count(),
    db.desvios.where("sincronizado").equals(0).count(),
    db.visitas.where("sincronizado").equals(0).count(),
  ]);
  return u + d + v;
}
