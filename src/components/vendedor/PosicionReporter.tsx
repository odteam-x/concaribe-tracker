"use client";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import { supabaseBrowser } from "@/lib/supabase/client";
import { queueUbicacion } from "@/lib/offline/queueRepository";
import { INTERVALO_TRACKING_MS } from "@/lib/constants";

/**
 * Reporta la posición del vendedor cada 60s desde CUALQUIER pantalla mientras tenga la
 * app abierta y haya concedido el permiso de ubicación — así aparece "en línea" en
 * oficina apenas entra, aunque todavía no haya iniciado ruta. Si tiene una jornada
 * abierta, la posición se asocia a ella; si no, se guarda con jornada_id nulo (igual
 * cuenta como "en línea"). Se desactiva en /ruta/activa porque ahí el tracker completo
 * (con desvío y geofencing) ya reporta la posición, para no duplicar.
 */
export function PosicionReporter() {
  const pathname = usePathname();
  const datos = useRef<{ vendedorId: string; jornadaId: string | null } | null>(null);

  // Refresca vendedorId + jornada abierta cada 30s
  useEffect(() => {
    let activo = true;
    async function revisar() {
      const {
        data: { user },
      } = await supabaseBrowser.auth.getUser();
      if (!user || !activo) return;
      const hoy = new Date().toISOString().slice(0, 10);
      const { data: jornada } = await supabaseBrowser
        .from("jornadas")
        .select("id, check_out")
        .eq("vendedor_id", user.id)
        .eq("fecha", hoy)
        .maybeSingle();
      datos.current = {
        vendedorId: user.id,
        jornadaId: jornada && !jornada.check_out ? jornada.id : null,
      };
    }
    void revisar();
    const id = setInterval(revisar, 30_000);
    return () => {
      activo = false;
      clearInterval(id);
    };
  }, []);

  useEffect(() => {
    if (pathname?.startsWith("/ruta/activa")) return; // el tracker de esa pantalla ya reporta
    if (!("geolocation" in navigator)) return;

    function reportar() {
      if (!datos.current) return;
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          void queueUbicacion({
            clientUuid: uuidv4(),
            vendedorId: datos.current!.vendedorId,
            jornadaId: datos.current!.jornadaId,
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            precisionMetros: pos.coords.accuracy,
            velocidadKmh: pos.coords.speed != null ? pos.coords.speed * 3.6 : null,
            timestampDispositivo: new Date().toISOString(),
            sincronizado: false,
          });
        },
        () => {}, // sin permiso o sin señal: simplemente no reporta este ciclo
        { enableHighAccuracy: true, timeout: 20_000, maximumAge: 30_000 }
      );
    }

    reportar();
    const id = setInterval(reportar, INTERVALO_TRACKING_MS);
    return () => clearInterval(id);
  }, [pathname]);

  return null;
}
