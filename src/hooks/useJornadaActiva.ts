"use client";
import { useCallback, useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

interface JornadaActiva {
  id: string;
  checkIn: string;
  checkOut: string | null;
}

/** Estado de check-in/check-out vigente del vendedor autenticado. */
export function useJornadaActiva(vendedorId: string | null) {
  const [jornada, setJornada] = useState<JornadaActiva | null>(null);
  const [cargando, setCargando] = useState(true);

  const recargar = useCallback(async () => {
    if (!vendedorId) {
      setCargando(false);
      return;
    }
    setCargando(true);
    const hoy = new Date().toISOString().slice(0, 10);
    const { data } = await supabaseBrowser
      .from("jornadas")
      .select("id, check_in, check_out")
      .eq("vendedor_id", vendedorId)
      .eq("fecha", hoy)
      .maybeSingle();

    setJornada(
      data
        ? { id: data.id as string, checkIn: data.check_in as string, checkOut: data.check_out as string | null }
        : null
    );
    setCargando(false);
  }, [vendedorId]);

  useEffect(() => {
    void recargar();
  }, [recargar]);

  const checkIn = useCallback(
    async (lat: number, lng: number) => {
      if (!vendedorId) return;
      const hoy = new Date().toISOString().slice(0, 10);
      const { data, error } = await supabaseBrowser
        .from("jornadas")
        .upsert(
          {
            vendedor_id: vendedorId,
            fecha: hoy,
            check_in: new Date().toISOString(),
            check_in_ubicacion: `SRID=4326;POINT(${lng} ${lat})`,
          },
          { onConflict: "vendedor_id,fecha" }
        )
        .select("id, check_in, check_out")
        .single();

      if (!error && data) {
        setJornada({ id: data.id, checkIn: data.check_in, checkOut: data.check_out });
      }
    },
    [vendedorId]
  );

  const checkOut = useCallback(
    async (lat: number, lng: number) => {
      if (!jornada) return;
      const { error } = await supabaseBrowser
        .from("jornadas")
        .update({
          check_out: new Date().toISOString(),
          check_out_ubicacion: `SRID=4326;POINT(${lng} ${lat})`,
        })
        .eq("id", jornada.id);

      if (!error) await recargar();
    },
    [jornada, recargar]
  );

  return {
    jornada,
    cargando,
    enCurso: !!jornada && !jornada.checkOut,
    checkIn,
    checkOut,
  };
}
