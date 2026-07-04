"use client";

export function ExportarReporteButton({ desde, hasta, vendedorId }: { desde: string; hasta: string; vendedorId?: string }) {
  const params = new URLSearchParams({ desde, hasta, ...(vendedorId ? { vendedorId } : {}) });

  return (
    <div className="flex gap-2">
      <a
        href={`/api/reportes/pdf?${params}`}
        className="rounded-md border border-marca-azul px-4 py-2 text-sm font-medium text-marca-azul hover:bg-marca-azul/5"
      >
        Exportar PDF
      </a>
      <a
        href={`/api/reportes/excel?${params}`}
        className="rounded-md border border-marca-azul px-4 py-2 text-sm font-medium text-marca-azul hover:bg-marca-azul/5"
      >
        Exportar Excel
      </a>
    </div>
  );
}
