"use client";
import { useUbicacionNavegador } from "@/hooks/useUbicacionNavegador";

/**
 * Pide el permiso de ubicación de forma proactiva y visible, en vez de esperar a que
 * una acción puntual (check-in, iniciar ruta) lo dispare implícitamente y falle en
 * silencio si el usuario no entendió el prompt del navegador.
 */
export function SolicitarUbicacionBanner() {
  const { permiso, solicitar } = useUbicacionNavegador({ activo: false });

  if (permiso === "granted" || permiso === "verificando" || permiso === "no-soportado") return null;

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-md border border-marca-azul/30 bg-marca-azul/5 px-4 py-3">
      <p className="text-sm text-marca-azul">
        {permiso === "denied"
          ? "Bloqueaste el permiso de ubicación en este navegador. Actívalo en la configuración del sitio para que el tracking, el check-in y el geofencing funcionen."
          : "Esta app necesita tu ubicación para el tracking, el check-in y el geofencing."}
      </p>
      {permiso !== "denied" && (
        <button
          onClick={solicitar}
          className="shrink-0 rounded-md bg-marca-azul px-3 py-1.5 text-sm font-medium text-white hover:bg-marca-azul-claro"
        >
          Activar ubicación
        </button>
      )}
    </div>
  );
}
