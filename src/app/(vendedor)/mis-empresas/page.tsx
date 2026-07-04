import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function MisEmpresasPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const { data: empresas } = await supabase
    .from("empresas")
    .select("id, nombre, direccion, categoria")
    .eq("vendedor_id", session!.user.id)
    .order("nombre");

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-marca-azul">Mis Empresas</h1>
        <Link href="/mis-empresas/nueva" className="rounded-md bg-marca-azul px-3 py-1.5 text-sm font-medium text-white">
          + Nueva
        </Link>
      </div>
      <div className="space-y-2">
        {(empresas ?? []).map((e) => (
          <Link
            key={e.id}
            href={`/mis-empresas/${e.id}`}
            className="block rounded-lg border border-slate-200 bg-white p-3 hover:border-marca-azul-claro"
          >
            <p className="font-medium text-slate-800">{e.nombre}</p>
            <p className="text-sm text-slate-500">{e.direccion}</p>
            {e.categoria && <p className="text-xs text-slate-400">{e.categoria}</p>}
          </Link>
        ))}
        {(empresas ?? []).length === 0 && (
          <p className="py-8 text-center text-sm text-slate-400">Aún no tienes empresas registradas.</p>
        )}
      </div>
    </div>
  );
}
