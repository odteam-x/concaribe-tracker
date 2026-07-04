export function ProgresoVisitasCounter({
  planificados,
  visitados,
  agregados,
}: {
  planificados: number;
  visitados: number;
  agregados: number;
}) {
  return (
    <div className="grid grid-cols-3 gap-2 text-center">
      <div className="rounded-lg border border-slate-200 bg-white py-2">
        <p className="text-lg font-semibold text-marca-azul">{visitados}/{planificados}</p>
        <p className="text-[11px] text-slate-500">Planificados</p>
      </div>
      <div className="rounded-lg border border-slate-200 bg-white py-2">
        <p className="text-lg font-semibold text-marca-lima-oscuro">{agregados}</p>
        <p className="text-[11px] text-slate-500">Agregados</p>
      </div>
      <div className="rounded-lg border border-slate-200 bg-white py-2">
        <p className="text-lg font-semibold text-marca-azul">{visitados + agregados}</p>
        <p className="text-[11px] text-slate-500">Total visitas</p>
      </div>
    </div>
  );
}
