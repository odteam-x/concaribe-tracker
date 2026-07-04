export type EstadoVendedor = "en_ruta" | "desviado" | "visitando" | "offline";

const ESTILOS: Record<EstadoVendedor, { label: string; className: string }> = {
  en_ruta: { label: "En ruta", className: "bg-marca-azul-claro/15 text-marca-azul-claro" },
  desviado: { label: "Desviado", className: "bg-estado-desviado/15 text-estado-desviado" },
  visitando: { label: "Visitando", className: "bg-marca-lima/20 text-marca-lima-oscuro" },
  offline: { label: "Offline", className: "bg-slate-200 text-slate-500" },
};

export function EstadoVendedorBadge({ estado }: { estado: EstadoVendedor }) {
  const { label, className } = ESTILOS[estado];
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}
