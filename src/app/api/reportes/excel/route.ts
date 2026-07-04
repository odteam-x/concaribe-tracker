import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { createSupabaseServerClient } from "@/lib/supabase/server";

interface FilaKm {
  vendedor_id: string;
  km_recorridos: number;
}
interface FilaTiempo {
  vendedor_id: string;
  minutos_promedio_por_visita: number | null;
}
interface FilaConversion {
  vendedor_id: string;
  interesados: number;
  cerrados: number;
  tasa_conversion_pct: number;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const desde = searchParams.get("desde")!;
  const hasta = searchParams.get("hasta")!;
  const vendedorId = searchParams.get("vendedorId") || null;

  const supabase = createSupabaseServerClient();

  const [{ data: km }, { data: tiempo }, { data: conversion }, { data: usuarios }] = await Promise.all([
    supabase.rpc("fn_metricas_km_recorridos", { p_desde: desde, p_hasta: hasta, p_vendedor_id: vendedorId }),
    supabase.rpc("fn_metricas_tiempo_por_visita", { p_desde: desde, p_hasta: hasta }),
    supabase.rpc("fn_metricas_conversion", { p_desde: desde, p_hasta: hasta }),
    supabase.from("usuarios").select("id, nombre").eq("rol", "vendedor"),
  ]);

  const kmFilas = (km ?? []) as FilaKm[];
  const tiempoFilas = (tiempo ?? []) as FilaTiempo[];
  const conversionFilas = (conversion ?? []) as FilaConversion[];

  const nombrePorId = new Map((usuarios ?? []).map((u) => [u.id, u.nombre]));
  const kmPorVendedor = new Map<string, number>();
  for (const f of kmFilas) kmPorVendedor.set(f.vendedor_id, (kmPorVendedor.get(f.vendedor_id) ?? 0) + f.km_recorridos);
  const tiempoPorVendedor = new Map(tiempoFilas.map((f) => [f.vendedor_id, f.minutos_promedio_por_visita]));
  const conversionPorVendedor = new Map(conversionFilas.map((f) => [f.vendedor_id, f]));

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(`Reporte ${desde} a ${hasta}`);
  sheet.columns = [
    { header: "Vendedor", key: "vendedor", width: 25 },
    { header: "Km recorridos", key: "km", width: 15 },
    { header: "Min. promedio/visita", key: "tiempo", width: 20 },
    { header: "Interesados", key: "interesados", width: 12 },
    { header: "Cerrados", key: "cerrados", width: 12 },
    { header: "Conversión %", key: "conversion", width: 15 },
  ];

  const ids = vendedorId ? [vendedorId] : [...nombrePorId.keys()];
  for (const id of ids) {
    const c = conversionPorVendedor.get(id);
    sheet.addRow({
      vendedor: nombrePorId.get(id) ?? id,
      km: Math.round((kmPorVendedor.get(id) ?? 0) * 10) / 10,
      tiempo: tiempoPorVendedor.get(id) ?? "—",
      interesados: c?.interesados ?? 0,
      cerrados: c?.cerrados ?? 0,
      conversion: c?.tasa_conversion_pct ?? 0,
    });
  }
  sheet.getRow(1).font = { bold: true };

  const buffer = await workbook.xlsx.writeBuffer();
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="reporte_${desde}_${hasta}.xlsx"`,
    },
  });
}
