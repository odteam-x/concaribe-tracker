"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import { queueVisita } from "@/lib/offline/queueRepository";
import { FotoCapture } from "./FotoCapture";

const RESULTADOS = [
  { value: "interesado", label: "Interesado" },
  { value: "no_interesado", label: "No interesado" },
  { value: "seguimiento", label: "Seguimiento" },
  { value: "cerrado", label: "Cerrado" },
  { value: "otro", label: "Otro" },
];

export function VisitaResultadoForm({
  empresaId,
  rutaId,
  vendedorId,
  llegadaAutomatica,
}: {
  empresaId: string;
  rutaId: string | null;
  vendedorId: string;
  llegadaAutomatica: boolean;
}) {
  const router = useRouter();
  const [resultado, setResultado] = useState("interesado");
  const [comentario, setComentario] = useState("");
  const [fotoBlob, setFotoBlob] = useState<Blob | null>(null);
  const [fotoNombre, setFotoNombre] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        await queueVisita({
          clientUuid: uuidv4(),
          empresaId,
          rutaId,
          vendedorId,
          resultado,
          comentario: comentario || null,
          fotoBlob,
          fotoNombre,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          timestampDispositivo: new Date().toISOString(),
          llegadaAutomatica,
          sincronizado: false,
        });
        setGuardando(false);
        router.push("/ruta/activa");
      },
      async () => {
        // Sin ubicación disponible: se encola igual con lat/lng en 0 — el offline-first no debe bloquear el registro
        await queueVisita({
          clientUuid: uuidv4(),
          empresaId,
          rutaId,
          vendedorId,
          resultado,
          comentario: comentario || null,
          fotoBlob,
          fotoNombre,
          lat: 0,
          lng: 0,
          timestampDispositivo: new Date().toISOString(),
          llegadaAutomatica,
          sincronizado: false,
        });
        setGuardando(false);
        router.push("/ruta/activa");
      }
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700">Resultado</label>
        <select
          value={resultado}
          onChange={(e) => setResultado(e.target.value)}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
        >
          {RESULTADOS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Comentario</label>
        <textarea
          value={comentario}
          onChange={(e) => setComentario(e.target.value)}
          rows={3}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
        />
      </div>
      <FotoCapture onFoto={(blob, nombre) => { setFotoBlob(blob); setFotoNombre(nombre); }} />
      <button
        type="submit"
        disabled={guardando}
        className="w-full rounded-md bg-marca-azul px-4 py-3 font-medium text-white disabled:opacity-60"
      >
        {guardando ? "Guardando..." : "Guardar visita"}
      </button>
    </form>
  );
}
