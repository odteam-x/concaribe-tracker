interface FilaMetrica {
  vendedor: string;
  kmRecorridos: number;
  visitas: number;
  minutosPromedioPorVisita: number | null;
  tasaConversionPct: number;
}

export function TablaMetricas({ filas }: { filas: FilaMetrica[] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-100 text-slate-600">
          <tr>
            <th className="px-4 py-3">Vendedor</th>
            <th className="px-4 py-3">Km recorridos</th>
            <th className="px-4 py-3">Visitas</th>
            <th className="px-4 py-3">Min. promedio/visita</th>
            <th className="px-4 py-3">Conversión</th>
          </tr>
        </thead>
        <tbody>
          {filas.map((f) => (
            <tr key={f.vendedor} className="border-t border-slate-100">
              <td className="px-4 py-3">{f.vendedor}</td>
              <td className="px-4 py-3">{f.kmRecorridos.toFixed(1)} km</td>
              <td className="px-4 py-3">{f.visitas}</td>
              <td className="px-4 py-3">{f.minutosPromedioPorVisita?.toFixed(0) ?? "—"}</td>
              <td className="px-4 py-3">{f.tasaConversionPct.toFixed(1)}%</td>
            </tr>
          ))}
          {filas.length === 0 && (
            <tr>
              <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                Sin datos para el rango seleccionado.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
