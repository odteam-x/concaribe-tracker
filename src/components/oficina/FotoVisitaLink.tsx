"use client";
import { useState } from "react";
import { obtenerUrlFirmadaFoto } from "@/lib/supabase/signedUrl";

/**
 * Muestra la foto de una visita bajo demanda. El bucket es privado, así que pedimos
 * una URL firmada de corta duración solo al hacer clic (no se exponen URLs públicas).
 */
export function FotoVisitaLink({ path }: { path: string | null }) {
  const [url, setUrl] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  if (!path) return <span className="text-slate-400">—</span>;

  async function ver() {
    setCargando(true);
    try {
      const firmada = await obtenerUrlFirmadaFoto(path!);
      setUrl(firmada);
    } catch {
      alert("No se pudo cargar la foto.");
    } finally {
      setCargando(false);
    }
  }

  if (url) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer">
        <img src={url} alt="Foto de la visita" className="h-14 w-14 rounded object-cover" />
      </a>
    );
  }

  return (
    <button onClick={ver} disabled={cargando} className="text-xs font-medium text-marca-azul-claro underline">
      {cargando ? "Cargando..." : "Ver foto"}
    </button>
  );
}
