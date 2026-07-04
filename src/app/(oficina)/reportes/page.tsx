import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ExportarReporteButton } from "@/components/oficina/ExportarReporteButton";

export default async function ReportesPage({
  searchParams,
}: {
  searchParams: { desde?: string; hasta?: string; vendedorId?: string };
}) {
  const supabase = createSupabaseServerClient();
  const { data: vendedores } = await supabase.from("usuarios").select("id, nombre").eq("rol", "vendedor").order("nombre");

  const hasta = searchParams.hasta ?? new Date().toISOString().slice(0, 10);
  const desde = searchParams.desde ?? new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-marca-azul">Reportes</h1>
      <form className="mb-6 flex flex-wrap items-end gap-3 text-sm" method="get">
        <div>
          <label className="block text-slate-600">Vendedor</label>
          <select name="vendedorId" defaultValue={searchParams.vendedorId ?? ""} className="rounded-md border border-slate-300 px-3 py-2">
            <option value="">Todos</option>
            {(vendedores ?? []).map((v) => (
              <option key={v.id} value={v.id}>
                {v.nombre}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-slate-600">Desde</label>
          <input type="date" name="desde" defaultValue={desde} className="rounded-md border border-slate-300 px-3 py-2" />
        </div>
        <div>
          <label className="block text-slate-600">Hasta</label>
          <input type="date" name="hasta" defaultValue={hasta} className="rounded-md border border-slate-300 px-3 py-2" />
        </div>
        <button className="rounded-md bg-marca-azul px-4 py-2 text-white">Aplicar</button>
      </form>
      <ExportarReporteButton desde={desde} hasta={hasta} vendedorId={searchParams.vendedorId} />
    </div>
  );
}
