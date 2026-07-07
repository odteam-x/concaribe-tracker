"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

/**
 * Botón de eliminar reutilizable: pide confirmación, borra la fila por id de la tabla
 * indicada (respetando RLS — el dueño o admin_oficina pueden), y redirige. Usado para
 * eliminar clientes y ubicaciones de referencia.
 */
export function EliminarButton({
  tabla,
  id,
  etiqueta,
  redirigirA,
}: {
  tabla: string;
  id: string;
  etiqueta: string;
  redirigirA: string;
}) {
  const router = useRouter();
  const [borrando, setBorrando] = useState(false);

  async function eliminar() {
    if (!confirm(`¿Seguro que quieres eliminar ${etiqueta}? Esta acción no se puede deshacer.`)) return;
    setBorrando(true);
    const { error } = await supabaseBrowser.from(tabla).delete().eq("id", id);
    setBorrando(false);
    if (error) {
      alert(`No se pudo eliminar: ${error.message}`);
      return;
    }
    router.push(redirigirA);
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={eliminar}
      disabled={borrando}
      className="w-full rounded-md border border-red-300 px-4 py-2 font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
    >
      {borrando ? "Eliminando..." : `Eliminar ${etiqueta}`}
    </button>
  );
}
