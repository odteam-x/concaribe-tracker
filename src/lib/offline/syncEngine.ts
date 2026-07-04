import { db } from "./db";
import { supabaseBrowser } from "@/lib/supabase/client";
import { RETENCION_OFFLINE_DIAS } from "@/lib/constants";

let syncEnCurso = false;

/**
 * Sincroniza todo lo pendiente en Dexie contra Supabase. Cada registro offline
 * lleva un client_uuid generado en el dispositivo; el upsert con
 * onConflict: "client_uuid", ignoreDuplicates: true hace que los reintentos sean
 * idempotentes — no hay conflicto de "última escritura gana" porque cada fila es
 * un evento inmutable (una lectura GPS, un desvío puntual, una visita).
 */
export async function ejecutarSync(): Promise<{ ok: number; error: number }> {
  if (syncEnCurso) return { ok: 0, error: 0 };
  syncEnCurso = true;
  let ok = 0,
    error = 0;

  try {
    const ubicacionesPendientes = await db.ubicaciones.where("sincronizado").equals(0).toArray();
    for (const u of ubicacionesPendientes) {
      const { error: err } = await supabaseBrowser.from("ubicaciones").upsert(
        {
          client_uuid: u.clientUuid,
          vendedor_id: u.vendedorId,
          jornada_id: u.jornadaId,
          punto: `SRID=4326;POINT(${u.lng} ${u.lat})`,
          precision_metros: u.precisionMetros,
          velocidad_kmh: u.velocidadKmh,
          timestamp_dispositivo: u.timestampDispositivo,
          sincronizado_offline: true,
        },
        { onConflict: "client_uuid", ignoreDuplicates: true }
      );

      if (!err) {
        await db.ubicaciones.update(u.clientUuid, { sincronizado: true });
        ok++;
      } else {
        await db.ubicaciones.update(u.clientUuid, { intentos: (u.intentos ?? 0) + 1 });
        error++;
      }
    }

    const desviosPendientes = await db.desvios.where("sincronizado").equals(0).toArray();
    for (const d of desviosPendientes) {
      const { error: err } = await supabaseBrowser.from("eventos_desvio").upsert(
        {
          client_uuid: d.clientUuid,
          vendedor_id: d.vendedorId,
          ruta_id: d.rutaId,
          ubicacion: `SRID=4326;POINT(${d.lng} ${d.lat})`,
          distancia_metros: d.distanciaMetros,
          timestamp_dispositivo: d.timestampDispositivo,
          motivo: d.motivo,
          sincronizado_offline: true,
        },
        { onConflict: "client_uuid", ignoreDuplicates: true }
      );
      if (!err) {
        await db.desvios.update(d.clientUuid, { sincronizado: true });
        ok++;
      } else {
        await db.desvios.update(d.clientUuid, { intentos: (d.intentos ?? 0) + 1 });
        error++;
      }
    }

    const visitasPendientes = await db.visitas.where("sincronizado").equals(0).toArray();
    for (const v of visitasPendientes) {
      let fotoPath: string | null = null;

      if (v.fotoBlob && v.fotoNombre) {
        // Bucket privado: se guarda solo el path, nunca una URL pública (ver signedUrl.ts)
        const path = `${v.vendedorId}/${v.clientUuid}-${v.fotoNombre}`;
        const { error: uploadErr } = await supabaseBrowser.storage
          .from("visitas-fotos")
          .upload(path, v.fotoBlob, { upsert: true });

        if (uploadErr) {
          error++;
          continue; // no se marca sincronizado; reintenta en el próximo ciclo
        }
        fotoPath = path;
      }

      const { error: err } = await supabaseBrowser.from("visitas").upsert(
        {
          client_uuid: v.clientUuid,
          empresa_id: v.empresaId,
          ruta_id: v.rutaId,
          vendedor_id: v.vendedorId,
          resultado: v.resultado,
          comentario: v.comentario,
          foto_url: fotoPath,
          llegada_automatica: v.llegadaAutomatica,
          ubicacion: `SRID=4326;POINT(${v.lng} ${v.lat})`,
          timestamp_dispositivo: v.timestampDispositivo,
          sincronizado_offline: true,
        },
        { onConflict: "client_uuid", ignoreDuplicates: true }
      );

      if (!err) {
        await db.visitas.update(v.clientUuid, { sincronizado: true });
        ok++;
      } else {
        await db.visitas.update(v.clientUuid, { intentos: (v.intentos ?? 0) + 1 });
        error++;
      }
    }

    await purgarSincronizadosAntiguos();
  } finally {
    syncEnCurso = false;
  }

  return { ok, error };
}

async function purgarSincronizadosAntiguos() {
  const limite = new Date(Date.now() - RETENCION_OFFLINE_DIAS * 24 * 60 * 60 * 1000).toISOString();
  await db.ubicaciones
    .where("sincronizado")
    .equals(1)
    .and((u) => u.timestampDispositivo < limite)
    .delete();
  await db.visitas
    .where("sincronizado")
    .equals(1)
    .and((v) => v.timestampDispositivo < limite)
    .delete();
  await db.desvios
    .where("sincronizado")
    .equals(1)
    .and((d) => d.timestampDispositivo < limite)
    .delete();
}

/**
 * Completa el motivo de un desvío ya reportado, sin importar si todavía está en
 * la cola offline o si ya se sincronizó con Supabase. El `update ... where motivo
 * is null` evita pisar un motivo ya completado desde otra sesión.
 */
export async function completarMotivoDesvio(clientUuid: string, motivo: string) {
  const pendiente = await db.desvios.get(clientUuid);

  if (pendiente && !pendiente.sincronizado) {
    await db.desvios.update(clientUuid, { motivo });
    if (navigator.onLine) void ejecutarSync();
    return;
  }

  await supabaseBrowser.from("eventos_desvio").update({ motivo, motivo_completado_en: new Date().toISOString() }).eq("client_uuid", clientUuid).is("motivo", null);

  if (pendiente) await db.desvios.update(clientUuid, { motivo });
}
