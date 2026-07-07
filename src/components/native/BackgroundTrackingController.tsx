"use client";
import { useEffect, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import { supabaseBrowser } from "@/lib/supabase/client";
import { queueUbicacion } from "@/lib/offline/queueRepository";
import { esNativo, iniciarSeguimientoFondo, detenerSeguimientoFondo } from "@/lib/native/backgroundGeo";

/**
 * Solo activo dentro de la APK nativa. Mantiene el reporte de ubicación aunque el
 * vendedor bloquee la pantalla o mande la app a segundo plano, mientras tenga una
 * jornada abierta hoy. Cada posición se encola (y sincroniza) igual que el tracking
 * en primer plano, así oficina lo sigue viendo en el mapa en vivo.
 *
 * En el navegador web normal no hace absolutamente nada (esNativo() === false).
 */
export function BackgroundTrackingController() {
  const watcherId = useRef<string | null>(null);
  const jornadaActiva = useRef<string | null>(null);
  const vendedorId = useRef<string | null>(null);

  useEffect(() => {
    if (!esNativo()) return;

    let cancelado = false;

    async function revisarJornada() {
      const {
        data: { user },
      } = await supabaseBrowser.auth.getUser();
      if (!user) return;
      vendedorId.current = user.id;

      const hoy = new Date().toISOString().slice(0, 10);
      const { data: jornada } = await supabaseBrowser
        .from("jornadas")
        .select("id, check_out")
        .eq("vendedor_id", user.id)
        .eq("fecha", hoy)
        .maybeSingle();

      const hayJornadaAbierta = !!jornada && !jornada.check_out;

      if (hayJornadaAbierta && !watcherId.current && !cancelado) {
        jornadaActiva.current = jornada!.id;
        watcherId.current = await iniciarSeguimientoFondo((lat, lng, precision, velocidad) => {
          if (!vendedorId.current) return;
          void queueUbicacion({
            clientUuid: uuidv4(),
            vendedorId: vendedorId.current,
            jornadaId: jornadaActiva.current,
            lat,
            lng,
            precisionMetros: precision,
            velocidadKmh: velocidad != null ? velocidad * 3.6 : null,
            timestampDispositivo: new Date().toISOString(),
            sincronizado: false,
          });
        });
      } else if (!hayJornadaAbierta && watcherId.current) {
        await detenerSeguimientoFondo(watcherId.current);
        watcherId.current = null;
        jornadaActiva.current = null;
      }
    }

    void revisarJornada();
    const intervalo = setInterval(revisarJornada, 30_000);

    return () => {
      cancelado = true;
      clearInterval(intervalo);
      void detenerSeguimientoFondo(watcherId.current);
      watcherId.current = null;
    };
  }, []);

  return null;
}
