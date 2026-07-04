import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { createSupabaseServerClient } from "@/lib/supabase/server";

interface FilaKm {
  vendedor_id: string;
  km_recorridos: number;
}
interface FilaConversion {
  vendedor_id: string;
  tasa_conversion_pct: number;
}

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 10 },
  titulo: { fontSize: 16, marginBottom: 12, color: "#1B3A6B" },
  fila: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#e2e8f0", paddingVertical: 4 },
  celda: { flex: 1 },
  header: { fontWeight: 700, backgroundColor: "#f1f5f9" },
});

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const desde = searchParams.get("desde")!;
  const hasta = searchParams.get("hasta")!;
  const vendedorId = searchParams.get("vendedorId") || null;

  const supabase = createSupabaseServerClient();
  const [{ data: km }, { data: conversion }, { data: usuarios }] = await Promise.all([
    supabase.rpc("fn_metricas_km_recorridos", { p_desde: desde, p_hasta: hasta, p_vendedor_id: vendedorId }),
    supabase.rpc("fn_metricas_conversion", { p_desde: desde, p_hasta: hasta }),
    supabase.from("usuarios").select("id, nombre").eq("rol", "vendedor"),
  ]);

  const kmFilas = (km ?? []) as FilaKm[];
  const conversionFilas = (conversion ?? []) as FilaConversion[];

  const nombrePorId = new Map((usuarios ?? []).map((u) => [u.id, u.nombre]));
  const kmPorVendedor = new Map<string, number>();
  for (const f of kmFilas) kmPorVendedor.set(f.vendedor_id, (kmPorVendedor.get(f.vendedor_id) ?? 0) + f.km_recorridos);
  const conversionPorVendedor = new Map(conversionFilas.map((f) => [f.vendedor_id, f]));

  const ids = vendedorId ? [vendedorId] : [...nombrePorId.keys()];

  const doc = (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.titulo}>Reporte Concaribe — {desde} a {hasta}</Text>
        <View style={[styles.fila, styles.header]}>
          <Text style={styles.celda}>Vendedor</Text>
          <Text style={styles.celda}>Km recorridos</Text>
          <Text style={styles.celda}>Conversión %</Text>
        </View>
        {ids.map((id) => {
          const c = conversionPorVendedor.get(id);
          return (
            <View style={styles.fila} key={id}>
              <Text style={styles.celda}>{nombrePorId.get(id) ?? id}</Text>
              <Text style={styles.celda}>{(kmPorVendedor.get(id) ?? 0).toFixed(1)}</Text>
              <Text style={styles.celda}>{c?.tasa_conversion_pct ?? 0}%</Text>
            </View>
          );
        })}
      </Page>
    </Document>
  );

  const buffer = await renderToBuffer(doc);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="reporte_${desde}_${hasta}.pdf"`,
    },
  });
}
