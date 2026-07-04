import { createSupabaseServerClient } from "@/lib/supabase/server";
import { TablaMetricas } from "@/components/oficina/TablaMetricas";
import { ExportarReporteButton } from "@/components/oficina/ExportarReporteButton";

interface FilaKm {
  vendedor_id: string;
  fecha: string;
  km_recorridos: number;
}
interface FilaTiempo {
  vendedor_id: string;
  minutos_promedio_por_visita: number | null;
  total_visitas: number;
}
interface FilaVisitasDia {
  vendedor_id: string;
  fecha: string;
  total_visitas: number;
  cerradas: number;
}
interface FilaConversion {
  vendedor_id: string;
  interesados: number;
  cerrados: number;
  tasa_conversion_pct: number;
}

export default async function MetricasPage({
  searchParams,
}: {
  searchParams: { desde?: string; hasta?: string };
}) {
  const hasta = searchParams.hasta ?? new Date().toISOString().slice(0, 10);
  const desde = searchParams.desde ?? new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10);

  const supabase = createSupabaseServerClient();
  const [{ data: usuarios }, { data: km }, { data: tiempo }, { data: visitasDia }, { data: conversion }] =
    await Promise.all([
      supabase.from("usuarios").select("id, nombre").eq("rol", "vendedor"),
      supabase.rpc("fn_metricas_km_recorridos", { p_desde: desde, p_hasta: hasta }),
      supabase.rpc("fn_metricas_tiempo_por_visita", { p_desde: desde, p_hasta: hasta }),
      supabase.rpc("fn_metricas_visitas_por_dia", { p_desde: desde, p_hasta: hasta }),
      supabase.rpc("fn_metricas_conversion", { p_desde: desde, p_hasta: hasta }),
    ]);

  const kmFilas = (km ?? []) as FilaKm[];
  const tiempoFilas = (tiempo ?? []) as FilaTiempo[];
  const visitasDiaFilas = (visitasDia ?? []) as FilaVisitasDia[];
  const conversionFilas = (conversion ?? []) as FilaConversion[];

  const nombrePorId = new Map((usuarios ?? []).map((u) => [u.id, u.nombre]));
  const kmPorVendedor = new Map<string, number>();
  for (const fila of kmFilas) kmPorVendedor.set(fila.vendedor_id, (kmPorVendedor.get(fila.vendedor_id) ?? 0) + fila.km_recorridos);
  const visitasPorVendedor = new Map<string, number>();
  for (const fila of visitasDiaFilas) visitasPorVendedor.set(fila.vendedor_id, (visitasPorVendedor.get(fila.vendedor_id) ?? 0) + fila.total_visitas);
  const tiempoPorVendedor = new Map(tiempoFilas.map((f) => [f.vendedor_id, f.minutos_promedio_por_visita]));
  const conversionPorVendedor = new Map(conversionFilas.map((f) => [f.vendedor_id, f.tasa_conversion_pct]));

  const filas = (usuarios ?? []).map((u) => ({
    vendedor: u.nombre,
    kmRecorridos: kmPorVendedor.get(u.id) ?? 0,
    visitas: visitasPorVendedor.get(u.id) ?? 0,
    minutosPromedioPorVisita: tiempoPorVendedor.get(u.id) ?? null,
    tasaConversionPct: conversionPorVendedor.get(u.id) ?? 0,
  }));

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-marca-azul">
          Métricas ({desde} — {hasta})
        </h1>
        <ExportarReporteButton desde={desde} hasta={hasta} />
      </div>
      <form className="mb-4 flex gap-3 text-sm" method="get">
        <input type="date" name="desde" defaultValue={desde} className="rounded-md border border-slate-300 px-3 py-2" />
        <input type="date" name="hasta" defaultValue={hasta} className="rounded-md border border-slate-300 px-3 py-2" />
        <button className="rounded-md bg-marca-azul px-4 py-2 text-white">Filtrar</button>
      </form>
      <TablaMetricas filas={filas} />
    </div>
  );
}
