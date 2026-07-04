"use client";
import Link from "next/link";

export function LlegadaAutoBanner({
  empresaId,
  nombre,
  onDeshacer,
}: {
  empresaId: string;
  nombre: string;
  onDeshacer: () => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-marca-lima/40 bg-marca-lima/10 p-3">
      <div>
        <p className="text-sm font-medium text-marca-lima-oscuro">Llegada detectada: {nombre}</p>
        <p className="text-xs text-slate-500">Se marcó automáticamente por proximidad (geofencing).</p>
      </div>
      <div className="flex gap-2">
        <button onClick={onDeshacer} className="text-xs text-slate-500 underline">
          No era aquí
        </button>
        <Link href={`/visita/${empresaId}`} className="rounded-md bg-marca-lima-oscuro px-3 py-1.5 text-xs font-medium text-white">
          Registrar visita
        </Link>
      </div>
    </div>
  );
}
