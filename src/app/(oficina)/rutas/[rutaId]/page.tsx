import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function RutaDetallePage({ params }: { params: { rutaId: string } }) {
  const supabase = createSupabaseServerClient();
  const { data: ruta } = await supabase
    .from("rutas")
    .select("id, fecha, turno, estado, orden_visitas, orden_sugerido, polyline, usuarios(nombre)")
    .eq("id", params.rutaId)
    .single();

  if (!ruta) return <p className="text-slate-500">Ruta no encontrada.</p>;

  const { data: empresas } = await supabase
    .from("empresas")
    .select("id, nombre, direccion")
    .in("id", ruta.orden_visitas ?? []);

  const empresasPorId = new Map((empresas ?? []).map((e) => [e.id, e]));

  return (
    <div>
      <h1 className="mb-2 text-2xl font-semibold text-marca-azul">
        Ruta de {(ruta as any).usuarios?.nombre} — {ruta.fecha}
      </h1>
      <p className="mb-6 text-sm text-slate-500">Solo lectura. Estado: {ruta.estado}</p>
      <ol className="space-y-2">
        {(ruta.orden_visitas ?? []).map((empresaId: string, i: number) => (
          <li key={empresaId} className="rounded-md border border-slate-200 bg-white px-4 py-3">
            <span className="mr-2 font-medium text-marca-azul">{i + 1}.</span>
            {empresasPorId.get(empresaId)?.nombre ?? "Empresa"} —{" "}
            <span className="text-slate-500">{empresasPorId.get(empresaId)?.direccion}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
