import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function HistorialPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const { data: rutas } = await supabase
    .from("rutas")
    .select("id, fecha, estado, orden_visitas")
    .eq("vendedor_id", session!.user.id)
    .order("fecha", { ascending: false })
    .limit(30);

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold text-marca-azul">Historial</h1>
      <div className="space-y-2">
        {(rutas ?? []).map((r) => (
          <Link
            key={r.id}
            href={`/historial/${r.id}`}
            className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3"
          >
            <span>{r.fecha}</span>
            <span className="text-xs text-slate-500">
              {r.orden_visitas?.length ?? 0} planificadas · {r.estado}
            </span>
          </Link>
        ))}
        {(rutas ?? []).length === 0 && <p className="py-8 text-center text-sm text-slate-400">Sin historial aún.</p>}
      </div>
    </div>
  );
}
