import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function VisitasPage() {
  const supabase = createSupabaseServerClient();
  const { data: visitas } = await supabase
    .from("visitas")
    .select("id, resultado, comentario, foto_url, timestamp_dispositivo, empresas(nombre), usuarios(nombre)")
    .order("timestamp_dispositivo", { ascending: false })
    .limit(100);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-marca-azul">Historial de visitas</h1>
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-100 text-slate-600">
            <tr>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Vendedor</th>
              <th className="px-4 py-3">Empresa</th>
              <th className="px-4 py-3">Resultado</th>
              <th className="px-4 py-3">Comentario</th>
              <th className="px-4 py-3">Foto</th>
            </tr>
          </thead>
          <tbody>
            {(visitas ?? []).map((v: any) => (
              <tr key={v.id} className="border-t border-slate-100">
                <td className="px-4 py-3">{new Date(v.timestamp_dispositivo).toLocaleString()}</td>
                <td className="px-4 py-3">{v.usuarios?.nombre}</td>
                <td className="px-4 py-3">{v.empresas?.nombre}</td>
                <td className="px-4 py-3 capitalize">{v.resultado.replace("_", " ")}</td>
                <td className="px-4 py-3">{v.comentario ?? "—"}</td>
                <td className="px-4 py-3">{v.foto_url ? "Sí" : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
