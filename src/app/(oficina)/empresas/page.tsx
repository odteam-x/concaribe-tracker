import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Oficina tiene CRUD total sobre el catálogo de CUALQUIER vendedor (requisito explícito).
export default async function EmpresasOficinaPage() {
  const supabase = createSupabaseServerClient();
  // empresas tiene DOS FKs a usuarios (vendedor_id y creado_por), así que el embed
  // debe desambiguar explícitamente cuál usar, o PostgREST falla y devuelve vacío.
  const { data: empresas } = await supabase
    .from("empresas")
    .select("id, nombre, direccion, categoria, vendedor:usuarios!empresas_vendedor_id_fkey(nombre)")
    .order("nombre")
    .limit(200);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-marca-azul">Clientes</h1>
        <Link
          href="/empresas/nueva"
          className="rounded-md bg-marca-azul px-4 py-2 text-sm font-medium text-white hover:bg-marca-azul-claro"
        >
          + Nuevo cliente
        </Link>
      </div>
      <p className="mb-4 text-sm text-slate-500">
        Catálogo global: aquí aparecen los clientes agregados por cada vendedor, y oficina puede
        agregar o editar clientes a nombre de cualquier vendedor.
      </p>
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
                <td className="px-4 py-3">{e.vendedor?.nombre ?? "—"}</td>
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
