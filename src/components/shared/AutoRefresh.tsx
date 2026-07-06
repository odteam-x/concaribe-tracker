"use client";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

// Tablas cuyos cambios deben reflejarse en las vistas de oficina sin refresh manual.
// (ubicaciones NO está aquí a propósito: cambia cada 60s por vendedor y el mapa en
// vivo ya la maneja con su propia suscripción — refrescar todo el árbol por cada
// ping GPS sería ruido innecesario.)
const TABLAS = ["visitas", "rutas", "jornadas", "gps_alertas", "eventos_desvio", "empresas", "ubicaciones_referencia", "usuarios", "mensajes"];

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
