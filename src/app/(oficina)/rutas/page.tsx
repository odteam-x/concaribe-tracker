import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Oficina hace seguimiento, no gestión: solo lectura. No hay "nueva ruta" ni edición aquí,
// las rutas siempre las crea el vendedor desde su panel (ver plan, sección RLS "rutas").
export default async function RutasPage() {
  const supabase = createSupabaseServerClient();
  const { data: rutas } = await supabase
    .from("rutas")
    .select("id, fecha, turno, estado, orden_visitas, usuarios(nombre)")
    .order("fecha", { ascending: false })
    .limit(50);

  return (
    <div>
      <h1 className="mb-2 text-2xl font-semibold text-marca-azul">Rutas</h1>
      <p className="mb-6 text-sm text-slate-500">
        Vista de solo lectura: cada vendedor define y confirma su propia ruta del día.
      </p>
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-100 text-slate-600">
            <tr>
              <th className="px-4 py-3">Vendedor</th>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Turno</th>
              <th className="px-4 py-3">Empresas</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {(rutas ?? []).map((r: any) => (
              <tr key={r.id} className="border-t border-slate-100">
                <td className="px-4 py-3">{r.usuarios?.nombre}</td>
                <td className="px-4 py-3">{r.fecha}</td>
                <td className="px-4 py-3">{r.turno}</td>
                <td className="px-4 py-3">{r.orden_visitas?.length ?? 0}</td>
                <td className="px-4 py-3">{r.estado}</td>
                <td className="px-4 py-3">
                  <Link href={`/rutas/${r.id}`} className="text-marca-azul-claro hover:underline">
                    Ver
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
