"use client";

interface EmpresaOrden {
  id: string;
  nombre: string;
}

/** Muestra el orden sugerido por Directions y permite reordenar manualmente (mover arriba/abajo). */
export function OrdenSugeridoVsManual({
  orden,
  empresasPorId,
  onMover,
}: {
  orden: string[];
  empresasPorId: Map<string, EmpresaOrden>;
  onMover: (indice: number, direccion: -1 | 1) => void;
}) {
  return (
    <ol className="space-y-2">
      {orden.map((empresaId, i) => (
        <li key={empresaId} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3">
          <span>
            <span className="mr-2 font-medium text-marca-azul">{i + 1}.</span>
            {empresasPorId.get(empresaId)?.nombre ?? empresaId}
          </span>
          <div className="flex gap-1">
            <button
              type="button"
              disabled={i === 0}
              onClick={() => onMover(i, -1)}
              className="rounded border border-slate-300 px-2 py-1 text-xs disabled:opacity-30"
            >
              ↑
            </button>
            <button
              type="button"
              disabled={i === orden.length - 1}
              onClick={() => onMover(i, 1)}
              className="rounded border border-slate-300 px-2 py-1 text-xs disabled:opacity-30"
            >
              ↓
            </button>
          </div>
        </li>
      ))}
    </ol>
  );
}
