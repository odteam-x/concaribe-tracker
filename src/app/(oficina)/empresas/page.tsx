import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Oficina tiene CRUD total sobre el catálogo de CUALQUIER vendedor (requisito explícito).
export default async function EmpresasOficinaPage() {
  const supabase = createSupabaseServerClient();
  const { data: empresas } = await supabase
    .from("empresas")
    .select("id, nombre, direccion, categoria, usuarios(nombre)")
    .order("nombre")
    .limit(200);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-marca-azul">Empresas (catálogo global)</h1>
        <Link
          href="/empresas/nueva"
          className="rounded-md bg-marca-azul px-4 py-2 text-sm font-medium text-white hover:bg-marca-azul-claro"
        >
          + Nueva empresa
        </Link>
      </div>
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-100 text-slate-600">
            <tr>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Dirección</th>
              <th className="px-4 py-3">Categoría</th>
              <th className="px-4 py-3">Vendedor</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {(empresas ?? []).map((e: any) => (
              <tr key={e.id} className="border-t border-slate-100">
                <td className="px-4 py-3">{e.nombre}</td>
                <td className="px-4 py-3">{e.direccion}</td>
                <td className="px-4 py-3">{e.categoria ?? "—"}</td>
                <td className="px-4 py-3">{e.usuarios?.nombre}</td>
                <td className="px-4 py-3">
                  <Link href={`/empresas/${e.id}`} className="text-marca-azul-claro hover:underline">
                    Editar
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
