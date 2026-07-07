"use client";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

// Tablas cuyos cambios deben reflejarse en las vistas de oficina sin refresh manual.
// EXCLUIDAS a propósito:
//  - ubicaciones: cambia cada 60s por vendedor; el mapa en vivo la maneja aparte.
//  - jornadas: un trigger la actualiza en CADA ping GPS (ultima_ubicacion_at), así que
//    escucharla causaría un refresco del árbol completo cada 60s por vendedor.
//  - mensajes: el chat tiene su propia suscripción realtime; no hace falta refrescar todo.
//  - usuarios: cambia rarísimo; no vale la pena una suscripción viva.
const TABLAS = ["visitas", "rutas", "gps_alertas", "eventos_desvio", "empresas", "ubicaciones_referencia"];

/**
 * Refresca los datos de los Server Components cuando cambia algo en la base de datos.
 * router.refresh() re-consulta el servidor SIN recargar la página ni perder el estado
 * de lo que el usuario esté haciendo (formularios abiertos, scroll, mapa, etc.).
 * Con debounce para agrupar ráfagas de cambios en un solo refresh.
 */
export function AutoRefresh() {
  const router = useRouter();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const canal = supabaseBrowser.channel("auto-refresh:oficina");

    for (const tabla of TABLAS) {
      canal.on("postgres_changes", { event: "*", schema: "public", table: tabla }, () => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => router.refresh(), 800);
      });
    }
    canal.subscribe();

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      supabaseBrowser.removeChannel(canal);
    };
  }, [router]);

  return null;
}
