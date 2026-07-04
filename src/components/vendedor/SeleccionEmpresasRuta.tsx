"use client";

interface EmpresaOpcion {
  id: string;
  nombre: string;
  direccion: string | null;
}

export function SeleccionEmpresasRuta({
  empresas,
  seleccionadas,
  onToggle,
}: {
  empresas: EmpresaOpcion[];
  seleccionadas: Set<string>;
  onToggle: (id: string) => void;
}) {
  return (
    <div className="space-y-2">
      {empresas.map((e) => (
        <label
          key={e.id}
          className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3"
        >
          <input type="checkbox" checked={seleccionadas.has(e.id)} onChange={() => onToggle(e.id)} className="h-4 w-4" />
          <div>
            <p className="font-medium text-slate-800">{e.nombre}</p>
            <p className="text-xs text-slate-500">{e.direccion}</p>
          </div>
        </label>
      ))}
      {empresas.length === 0 && (
        <p className="py-8 text-center text-sm text-slate-400">
          No tienes empresas registradas. Agrega alguna en &quot;Mis Empresas&quot; primero.
        </p>
      )}
    </div>
  );
}
