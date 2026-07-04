import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function HistorialRutaDetallePage({ params }: { params: { rutaId: string } }) {
  const supabase = createSupabaseServerClient();
  const { data: ruta } = await supabase
    .from("rutas")
    .select("fecha, estado, orden_visitas")
    .eq("id", params.rutaId)
    .single();

  const { data: visitas } = await supabase
    .from("visitas")
    .select("empresa_id, resultado, comentario, timestamp_dispositivo, empresas(nombre)")
    .eq("ruta_id", params.rutaId)
    .order("timestamp_dispositivo");

  if (!ruta) return <p className="text-slate-500">Ruta no encontrada.</p>;

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-marca-azul">Ruta del {ruta.fecha}</h1>
      <p className="mb-4 text-sm text-slate-500">
        {ruta.orden_visitas?.length ?? 0} planificadas · {ruta.estado}
      </p>
      <div className="space-y-2">
        {(visitas ?? []).map((v: any, i: number) => (
          <div key={i} className="rounded-lg border border-slate-200 bg-white p-3">
            <p className="font-medium text-slate-800">{v.empresas?.nombre}</p>
            <p className="text-xs text-slate-500 capitalize">{v.resultado.replace("_", " ")} — {new Date(v.timestamp_dispositivo).toLocaleTimeString()}</p>
            {v.comentario && <p className="mt-1 text-sm text-slate-600">{v.comentario}</p>}
          </div>
        ))}
        {(visitas ?? []).length === 0 && <p className="py-8 text-center text-sm text-slate-400">Sin visitas registradas.</p>}
      </div>
    </div>
  );
}
