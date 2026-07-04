import { createSupabaseServerClient } from "@/lib/supabase/server";
import { EstadoVendedorBadge, type EstadoVendedor } from "@/components/oficina/EstadoVendedorBadge";

interface FilaVendedor {
  id: string;
  nombre: string;
  estado: EstadoVendedor;
}

async function obtenerEstadoVendedores(): Promise<FilaVendedor[]> {
  const supabase = createSupabaseServerClient();

  const { data: vendedores } = await supabase.from("usuarios").select("id, nombre").eq("rol", "vendedor");
  if (!vendedores) return [];

  const hoy = new Date().toISOString().slice(0, 10);

  const filas: FilaVendedor[] = [];
  for (const v of vendedores) {
    const { data: jornada } = await supabase
      .from("jornadas")
      .select("gps_activo, check_out")
      .eq("vendedor_id", v.id)
      .eq("fecha", hoy)
      .maybeSingle();

    if (!jornada || jornada.check_out) {
      filas.push({ id: v.id, nombre: v.nombre, estado: "offline" });
      continue;
    }
    if (!jornada.gps_activo) {
      filas.push({ id: v.id, nombre: v.nombre, estado: "offline" });
      continue;
    }

    const { data: desvioAbierto } = await supabase
      .from("eventos_desvio")
      .select("id")
      .eq("vendedor_id", v.id)
      .is("motivo_completado_en", null)
      .order("timestamp_dispositivo", { ascending: false })
      .limit(1)
      .maybeSingle();

    filas.push({ id: v.id, nombre: v.nombre, estado: desvioAbierto ? "desviado" : "en_ruta" });
  }

  return filas;
}

export default async function DashboardPage() {
  const filas = await obtenerEstadoVendedores();

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-marca-azul">Estado en vivo</h1>
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-100 text-slate-600">
            <tr>
              <th className="px-4 py-3">Vendedor</th>
              <th className="px-4 py-3">Estado</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => (
              <tr key={f.id} className="border-t border-slate-100">
                <td className="px-4 py-3">{f.nombre}</td>
                <td className="px-4 py-3">
                  <EstadoVendedorBadge estado={f.estado} />
                </td>
              </tr>
            ))}
            {filas.length === 0 && (
              <tr>
                <td colSpan={2} className="px-4 py-6 text-center text-slate-400">
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
