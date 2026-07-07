"use client";
import { useCallback, useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { EstadoVendedorBadge, type EstadoVendedor } from "./EstadoVendedorBadge";

interface FilaVendedor {
  id: string;
  nombre: string;
  estado: EstadoVendedor;
  visitasHoy: number;
  ultimaPosicion: string | null; // ISO, para saber qué tan reciente
}

interface Resumen {
  activos: number;
  visitasHoy: number;
  cerradasHoy: number;
  desviosAbiertos: number;
  alertasAbiertas: number;
}

// Un vendedor cuenta como "activo/en línea" si reportó posición en los últimos 4 min.
const MINUTOS_ACTIVO = 4;

function Tarjeta({ valor, etiqueta, color = "text-marca-azul" }: { valor: number | string; etiqueta: string; color?: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <p className={`text-3xl font-semibold ${color}`}>{valor}</p>
      <p className="text-xs text-slate-500">{etiqueta}</p>
    </div>
  );
}

/**
 * Dashboard que se consulta a sí mismo cada 7s (no depende del realtime, así que
 * funciona aunque la publicación realtime no esté configurada). Refleja el estado real
 * de cada vendedor según su última posición reportada.
 */
export function DashboardLive() {
  const [filas, setFilas] = useState<FilaVendedor[]>([]);
  const [resumen, setResumen] = useState<Resumen>({ activos: 0, visitasHoy: 0, cerradasHoy: 0, desviosAbiertos: 0, alertasAbiertas: 0 });

  const cargar = useCallback(async () => {
    const hoy = new Date().toISOString().slice(0, 10);

    const [{ data: vendedores }, { data: visitas }, { data: ubic }, { data: desvios }, { count: alertas }] =
      await Promise.all([
        supabaseBrowser.from("usuarios").select("id, nombre").eq("rol", "vendedor").order("nombre"),
        supabaseBrowser
          .from("visitas")
          .select("vendedor_id, resultado")
          .gte("timestamp_dispositivo", `${hoy}T00:00:00`)
          .lte("timestamp_dispositivo", `${hoy}T23:59:59`),
        supabaseBrowser
          .from("ubicaciones")
          .select("vendedor_id, timestamp_dispositivo")
          .order("timestamp_dispositivo", { ascending: false })
          .limit(400),
        supabaseBrowser.from("eventos_desvio").select("vendedor_id").is("motivo", null),
        supabaseBrowser.from("gps_alertas").select("id", { count: "exact", head: true }).eq("resuelto", false),
      ]);

    const ultimaPorVendedor = new Map<string, string>();
    for (const u of ubic ?? []) {
      if (!ultimaPorVendedor.has(u.vendedor_id)) ultimaPorVendedor.set(u.vendedor_id, u.timestamp_dispositivo);
    }

    const visitasPorVendedor = new Map<string, number>();
    let cerradasHoy = 0;
    for (const v of visitas ?? []) {
      visitasPorVendedor.set(v.vendedor_id, (visitasPorVendedor.get(v.vendedor_id) ?? 0) + 1);
      if (v.resultado === "cerrado") cerradasHoy++;
    }

    const desviadosSet = new Set((desvios ?? []).map((d) => d.vendedor_id));
    const ahora = Date.now();
    let activos = 0;

    const nuevasFilas: FilaVendedor[] = (vendedores ?? []).map((v) => {
      const ultima = ultimaPorVendedor.get(v.id) ?? null;
      const activo = ultima ? (ahora - new Date(ultima).getTime()) / 60000 < MINUTOS_ACTIVO : false;
      let estado: EstadoVendedor = "offline";
      if (activo) {
        estado = desviadosSet.has(v.id) ? "desviado" : "en_ruta";
        activos++;
      }
      return { id: v.id, nombre: v.nombre, estado, visitasHoy: visitasPorVendedor.get(v.id) ?? 0, ultimaPosicion: ultima };
    });

    setFilas(nuevasFilas);
    setResumen({
      activos,
      visitasHoy: (visitas ?? []).length,
      cerradasHoy,
      desviosAbiertos: (desvios ?? []).length,
      alertasAbiertas: alertas ?? 0,
    });
  }, []);

  useEffect(() => {
    void cargar();
    const id = setInterval(() => void cargar(), 7000);
    return () => clearInterval(id);
  }, [cargar]);

  return (
    <div>
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Tarjeta valor={resumen.activos} etiqueta="Vendedores en línea" />
        <Tarjeta valor={resumen.visitasHoy} etiqueta="Visitas hoy" />
        <Tarjeta valor={resumen.cerradasHoy} etiqueta="Cierres hoy" color="text-marca-lima-oscuro" />
        <Tarjeta valor={resumen.desviosAbiertos} etiqueta="Desvíos sin motivo" color="text-estado-desviado" />
        <Tarjeta valor={resumen.alertasAbiertas} etiqueta="Alertas GPS" color="text-red-600" />
      </div>

      <h2 className="mb-3 text-lg font-medium text-slate-700">Estado en vivo por vendedor</h2>
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-100 text-slate-600">
            <tr>
              <th className="px-4 py-3">Vendedor</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Última señal</th>
              <th className="px-4 py-3">Visitas hoy</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => (
              <tr key={f.id} className="border-t border-slate-100">
                <td className="px-4 py-3">{f.nombre}</td>
                <td className="px-4 py-3">
                  <EstadoVendedorBadge estado={f.estado} />
                </td>
                <td className="px-4 py-3 text-slate-500">
                  {f.ultimaPosicion ? new Date(f.ultimaPosicion).toLocaleTimeString("es-DO") : "—"}
                </td>
                <td className="px-4 py-3">{f.visitasHoy}</td>
              </tr>
            ))}
            {filas.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                  No hay vendedores registrados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-slate-400">Se actualiza automáticamente cada 7 segundos.</p>
    </div>
  );
}
