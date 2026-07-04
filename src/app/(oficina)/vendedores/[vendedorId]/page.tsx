import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function PerfilVendedorPage({ params }: { params: { vendedorId: string } }) {
  const supabase = createSupabaseServerClient();
  const { data: vendedor } = await supabase
    .from("usuarios")
    .select("nombre, email, telefono")
    .eq("id", params.vendedorId)
    .single();

  const { data: jornadas } = await supabase
    .from("jornadas")
    .select("fecha, check_in, check_out, gps_activo")
    .eq("vendedor_id", params.vendedorId)
    .order("fecha", { ascending: false })
    .limit(14);

  if (!vendedor) return <p className="text-slate-500">Vendedor no encontrado.</p>;

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold text-marca-azul">{vendedor.nombre}</h1>
      <p className="mb-6 text-sm text-slate-500">{vendedor.email} · {vendedor.telefono ?? "sin teléfono"}</p>

      <div className="mb-4 flex gap-3">
        <Link
          href={`/vendedores/${params.vendedorId}/replay`}
          className="rounded-md bg-marca-azul px-4 py-2 text-sm font-medium text-white hover:bg-marca-azul-claro"
        >
          Ver replay del día
        </Link>
        <Link
          href={`/chat/${params.vendedorId}`}
          className="rounded-md border border-marca-azul px-4 py-2 text-sm font-medium text-marca-azul hover:bg-marca-azul/5"
        >
          Chatear
        </Link>
      </div>

      <h2 className="mb-2 mt-6 text-lg font-medium text-slate-700">Jornadas recientes</h2>
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-100 text-slate-600">
            <tr>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Check-in</th>
              <th className="px-4 py-3">Check-out</th>
              <th className="px-4 py-3">GPS</th>
            </tr>
          </thead>
          <tbody>
            {(jornadas ?? []).map((j) => (
              <tr key={j.fecha} className="border-t border-slate-100">
                <td className="px-4 py-3">{j.fecha}</td>
                <td className="px-4 py-3">{j.check_in ? new Date(j.check_in).toLocaleTimeString() : "—"}</td>
                <td className="px-4 py-3">{j.check_out ? new Date(j.check_out).toLocaleTimeString() : "—"}</td>
                <td className="px-4 py-3">{j.gps_activo ? "Activo" : "Apagado"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
