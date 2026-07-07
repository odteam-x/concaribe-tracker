import { createSupabaseServerClient } from "@/lib/supabase/server";
import { EstadoVendedorBadge, type EstadoVendedor } from "@/components/oficina/EstadoVendedorBadge";

interface FilaVendedor {
  id: string;
  nombre: string;
  estado: EstadoVendedor;
  visitasHoy: number;
}

interface ResumenDia {
  vendedoresActivos: number;
  visitasHoy: number;
  cerradasHoy: number;
  desviosAbiertos: number;
  alertasAbiertas: number;
}

async function obtenerDatos(): Promise<{ filas: FilaVendedor[]; resumen: ResumenDia }> {
  const supabase = createSupabaseServerClient();
  const hoy = new Date().toISOString().slice(0, 10);

  const { data: vendedores } = await supabase.from("usuarios").select("id, nombre").eq("rol", "vendedor");

  // Visitas de hoy (todas), para contar por vendedor y totales
  const { data: visitasHoy } = await supabase
    .from("visitas")
    .select("vendedor_id, resultado")
    .gte("timestamp_dispositivo", `${hoy}T00:00:00`)
    .lte("timestamp_dispositivo", `${hoy}T23:59:59`);

  const visitasPorVendedor = new Map<string, number>();
  let cerradasHoy = 0;
  for (const v of visitasHoy ?? []) {
    visitasPorVendedor.set(v.vendedor_id, (visitasPorVendedor.get(v.vendedor_id) ?? 0) + 1);
    if (v.resultado === "cerrado") cerradasHoy++;
  }

  const filas: FilaVendedor[] = [];
  let vendedoresActivos = 0;
  for (const v of vendedores ?? []) {
    const { data: jornada } = await supabase
      .from("jornadas")
      .select("gps_activo, check_out")
      .eq("vendedor_id", v.id)
      .eq("fecha", hoy)
      .maybeSingle();

    let estado: EstadoVendedor = "offline";
    if (jornada && !jornada.check_out && jornada.gps_activo) {
      const { data: desvioAbierto } = await supabase
        .from("eventos_desvio")
        .select("id")
        .eq("vendedor_id", v.id)
        .is("motivo_completado_en", null)
        .limit(1)
        .maybeSingle();
      estado = desvioAbierto ? "desviado" : "en_ruta";
      vendedoresActivos++;
    }
    filas.push({ id: v.id, nombre: v.nombre, estado, visitasHoy: visitasPorVendedor.get(v.id) ?? 0 });
  }

  const [{ count: desviosAbiertos }, { count: alertasAbiertas }] = await Promise.all([
    supabase.from("eventos_desvio").select("id", { count: "exact", head: true }).is("motivo", null),
    supabase.from("gps_alertas").select("id", { count: "exact", head: true }).eq("resuelto", false),
  ]);

  return {
    filas,
    resumen: {
      vendedoresActivos,
      visitasHoy: (visitasHoy ?? []).length,
      cerradasHoy,
      desviosAbiertos: desviosAbiertos ?? 0,
      alertasAbiertas: alertasAbiertas ?? 0,
    },
  };
}

function Tarjeta({ valor, etiqueta, color = "text-marca-azul" }: { valor: number | string; etiqueta: string; color?: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <p className={`text-3xl font-semibold ${color}`}>{valor}</p>
      <p className="text-xs text-slate-500">{etiqueta}</p>
    </div>
  );
}

export default async function DashboardPage() {
  const { filas, resumen } = await obtenerDatos();
  const fechaBonita = new Date().toLocaleDateString("es-DO", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div>
      <h1 className="text-2xl font-semibold text-marca-azul">Resumen del día</h1>
      <p className="mb-6 text-sm capitalize text-slate-500">{fechaBonita}</p>

      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Tarjeta valor={resumen.vendedoresActivos} etiqueta="Vendedores en ruta" />
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
                <td className="px-4 py-3">{f.visitasHoy}</td>
              </tr>
            ))}
            {filas.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-slate-400">
                  No hay vendedores registrados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
