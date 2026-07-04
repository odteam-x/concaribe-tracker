import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function InicioPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const vendedorId = session!.user.id;
  const hoy = new Date().toISOString().slice(0, 10);
  const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);

  const [{ data: usuario }, { data: ruta }, { data: progreso }, { data: conversion }, { count: totalEmpresas }] =
    await Promise.all([
      supabase.from("usuarios").select("nombre").eq("id", vendedorId).single(),
      supabase.from("rutas").select("id, estado").eq("vendedor_id", vendedorId).eq("fecha", hoy).maybeSingle(),
      supabase.rpc("fn_progreso_ruta_hoy", { p_vendedor_id: vendedorId }),
      supabase.rpc("fn_metricas_conversion", { p_desde: inicioMes, p_hasta: hoy }),
      supabase.from("empresas").select("id", { count: "exact", head: true }).eq("vendedor_id", vendedorId),
    ]);

  const progresoHoy = progreso?.[0];
  const conversionMes = conversion?.find((c: any) => true); // función ya filtra por vendedor vía RLS security invoker

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-marca-azul">Hola, {usuario?.nombre}</h1>
        <p className="text-sm text-slate-500">{new Date().toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" })}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-2xl font-semibold text-marca-azul">{progresoHoy?.visitados_planificados ?? 0}/{progresoHoy?.total_planificados ?? 0}</p>
          <p className="text-xs text-slate-500">Visitados hoy</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-2xl font-semibold text-marca-lima-oscuro">{progresoHoy?.agregados_visitados ?? 0}</p>
          <p className="text-xs text-slate-500">Agregados hoy</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-2xl font-semibold text-marca-azul">{totalEmpresas ?? 0}</p>
          <p className="text-xs text-slate-500">Empresas propias</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-2xl font-semibold text-marca-azul">{conversionMes?.tasa_conversion_pct ?? 0}%</p>
          <p className="text-xs text-slate-500">Conversión del mes</p>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {ruta ? (
          <Link href="/ruta/activa" className="rounded-md bg-marca-azul px-4 py-3 text-center font-medium text-white">
            Continuar ruta de hoy ({ruta.estado})
          </Link>
        ) : (
          <Link href="/ruta/iniciar" className="rounded-md bg-marca-azul px-4 py-3 text-center font-medium text-white">
            Iniciar ruta de hoy
          </Link>
        )}
        <Link href="/mis-empresas" className="rounded-md border border-marca-azul px-4 py-3 text-center font-medium text-marca-azul">
          Ver mis empresas
        </Link>
      </div>
    </div>
  );
}
