interface Similar {
  empresa_id: string;
  nombre: string;
  distancia_metros: number;
  similitud: number;
  es_propia: boolean;
  ya_visitada: boolean;
}

/** Aviso de posible empresa duplicada. Nunca expone la ficha completa de un catálogo ajeno. */
export function DuplicadoEmpresaWarning({ candidatos }: { candidatos: Similar[] }) {
  if (candidatos.length === 0) return null;

  return (
    <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
      <p className="mb-1 font-medium">Posibles empresas ya registradas cerca:</p>
      <ul className="list-inside list-disc space-y-0.5">
        {candidatos.map((c) => (
          <li key={c.empresa_id}>
            {c.nombre} — {Math.round(c.distancia_metros)}m
            {c.es_propia ? " (tuya)" : " (otro vendedor)"}
            {c.ya_visitada ? ", ya visitada" : ""}
          </li>
        ))}
      </ul>
    </div>
  );
}
