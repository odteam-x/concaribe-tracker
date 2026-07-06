import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const ETIQUETA_CATEGORIA: Record<string, string> = {
  empresa: "Empresa",
  almacen: "Almacén",
  local: "Local",
  otro: "Otro",
};

// Solo admin_oficina gestiona (crea/edita) ubicaciones de referencia; el resto solo las ve en el mapa.
export default async function UbicacionesPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const { data: yo } = await supabase.from("usuarios").select("rol").eq("id", session!.user.id).single();
  if (yo?.rol !== "admin_oficina") redirect("/dashboard");

  const { data: ubicaciones } = await supabase
    .from("ubicaciones_referencia")
    .select("id, nombre, categoria, direccion")
    .order("nombre");

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-marca-azul">Ubicaciones</h1>
        <Link
          href="/ubicaciones/nueva"
          className="rounded-md bg-marca-azul px-4 py-2 text-sm font-medium text-white hover:bg-marca-azul-claro"
        >
          + Nueva ubicación
        </Link>
      </div>
      <p className="mb-4 text-sm text-slate-500">
        Puntos de referencia (almacenes, oficinas, locales) visibles en el mapa en vivo para todos los
        roles. Solo oficina puede agregarlos o editarlos.
      </p>
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-100 text-slate-600">
            <tr>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Categoría</th>
              <th className="px-4 py-3">Dirección</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {(ubicaciones ?? []).map((u) => (
              <tr key={u.id} className="border-t border-slate-100">
                <td className="px-4 py-3">{u.nombre}</td>
                <td className="px-4 py-3">{ETIQUETA_CATEGORIA[u.categoria] ?? u.categoria}</td>
                <td className="px-4 py-3">{u.direccion}</td>
                <td className="px-4 py-3">
                  <Link href={`/ubicaciones/${u.id}`} className="text-marca-azul-claro hover:underline">
                    Editar
                  </Link>
                </td>
              </tr>
            ))}
            {(ubicaciones ?? []).length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                  Sin ubicaciones registradas todavía.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
