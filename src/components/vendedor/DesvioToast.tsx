"use client";
import { useState } from "react";

interface DesvioPendiente {
  clientUuid: string;
  distanciaMetros: number;
}

/**
 * No bloqueante: aparece como banner reabordable. El vendedor puede seguir usando
 * la app y completar el motivo después — nunca impide continuar la ruta.
 */
export function DesvioToast({
  desvio,
  onCompletarMotivo,
  onDescartar,
}: {
  desvio: DesvioPendiente;
  onCompletarMotivo: (motivo: string) => Promise<void>;
  onDescartar: () => void;
}) {
  const [motivo, setMotivo] = useState("");
  const [expandido, setExpandido] = useState(false);
  const [enviando, setEnviando] = useState(false);

  async function handleEnviar() {
    if (!motivo.trim()) return;
    setEnviando(true);
    await onCompletarMotivo(motivo.trim());
    setEnviando(false);
  }

  return (
    <div className="rounded-lg border border-estado-desviado/40 bg-estado-desviado/10 p-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-estado-desviado">
          Desvío detectado: {Math.round(desvio.distanciaMetros)}m de la ruta
        </p>
        <button onClick={() => setExpandido((v) => !v)} className="text-xs text-estado-desviado underline">
          {expandido ? "Ocultar" : "Explicar"}
        </button>
      </div>
      {expandido && (
        <div className="mt-2 flex gap-2">
          <input
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Motivo del desvío..."
            className="flex-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm"
          />
          <button
            onClick={handleEnviar}
            disabled={enviando}
            className="rounded-md bg-estado-desviado px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60"
          >
            Guardar
          </button>
        </div>
      )}
      <button onClick={onDescartar} className="mt-1 text-xs text-slate-500 underline">
        Recordar más tarde
      </button>
    </div>
  );
}
