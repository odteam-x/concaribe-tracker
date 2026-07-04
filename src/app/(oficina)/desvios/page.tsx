import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function DesviosPage() {
  const supabase = createSupabaseServerClient();
  const { data: desvios } = await supabase
    .from("eventos_desvio")
    .select("id, distancia_metros, motivo, timestamp_dispositivo, usuarios(nombre)")
    .order("timestamp_dispositivo", { ascending: false })
    .limit(100);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-marca-azul">Historial de desvíos</h1>
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-100 text-slate-600">
            <tr>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Vendedor</th>
              <th className="px-4 py-3">Distancia</th>
              <th className="px-4 py-3">Motivo</th>
            </tr>
          </thead>
          <tbody>
            {(desvios ?? []).map((d: any) => (
              <tr key={d.id} className="border-t border-slate-100">
                <td className="px-4 py-3">{new Date(d.timestamp_dispositivo).toLocaleString()}</td>
                <td className="px-4 py-3">{d.usuarios?.nombre}</td>
                <td className="px-4 py-3">{Math.round(d.distancia_metros)} m</td>
                <td className="px-4 py-3">
                  {d.motivo ?? <span className="text-estado-desviado">Pendiente de motivo</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
