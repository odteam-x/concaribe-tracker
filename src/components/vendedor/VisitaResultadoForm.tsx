"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import { queueVisita } from "@/lib/offline/queueRepository";
import { FotoCapture } from "./FotoCapture";

const RESULTADOS = [
  { value: "visitado", label: "Visitado" },
  { value: "cotizado", label: "Cotizado" },
  { value: "interesado", label: "Interesado" },
  { value: "no_interesado", label: "No interesado" },
  { value: "seguimiento", label: "Seguimiento" },
  { value: "cerrado", label: "Cerrado" },
  { value: "otro", label: "Otro" },
];

// Obtiene la posición SIN colgar la UI: si el GPS no responde en 6s, sigue con 0,0.
// El getCurrentPosition sin timeout podía quedarse esperando para siempre (era el
// motivo de que "Guardar visita" se quedara pegado).
function obtenerPosicionSegura(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve) => {
    if (!("geolocation" in navigator)) return resolve({ lat: 0, lng: 0 });
    let resuelto = false;
    const finalizar = (v: { lat: number; lng: number }) => {
      if (!resuelto) {
        resuelto = true;
        resolve(v);
      }
    };
    const t = setTimeout(() => finalizar({ lat: 0, lng: 0 }), 6000);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(t);
        finalizar({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => {
        clearTimeout(t);
        finalizar({ lat: 0, lng: 0 });
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 30000 }
    );
  });
}

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
  const [resultado, setResultado] = useState("visitado");
  const [comentario, setComentario] = useState("");
  const [fotoBlob, setFotoBlob] = useState<Blob | null>(null);
  const [fotoNombre, setFotoNombre] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);

    const { lat, lng } = await obtenerPosicionSegura();
    await queueVisita({
      clientUuid: uuidv4(),
      empresaId,
      rutaId,
      vendedorId,
      resultado,
      comentario: comentario || null,
      fotoBlob,
      fotoNombre,
      lat,
      lng,
      timestampDispositivo: new Date().toISOString(),
      llegadaAutomatica,
      sincronizado: false,
    });

    // La visita queda guardada localmente (y se sincroniza en segundo plano). No
    // esperamos a la subida a Supabase para no bloquear al vendedor.
    router.push("/ruta/activa");
    router.refresh();
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
      <FotoCapture
        onFoto={(blob, nombre) => {
          setFotoBlob(blob);
          setFotoNombre(nombre);
        }}
      />
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
