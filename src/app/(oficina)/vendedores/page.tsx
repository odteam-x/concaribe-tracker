import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function VendedoresPage() {
  const supabase = createSupabaseServerClient();
  const { data: vendedores } = await supabase
    .from("usuarios")
    .select("id, nombre, email, telefono, activo")
    .eq("rol", "vendedor")
    .order("nombre");

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-marca-azul">Vendedores</h1>
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-100 text-slate-600">
            <tr>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Correo</th>
              <th className="px-4 py-3">Teléfono</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {(vendedores ?? []).map((v) => (
              <tr key={v.id} className="border-t border-slate-100">
                <td className="px-4 py-3">{v.nombre}</td>
                <td className="px-4 py-3">{v.email}</td>
                <td className="px-4 py-3">{v.telefono ?? "—"}</td>
                <td className="px-4 py-3">
                  <Link href={`/vendedores/${v.id}`} className="text-marca-azul-claro hover:underline">
                    Ver perfil
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
