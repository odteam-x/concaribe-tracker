"use client";

import { useEffect, useRef, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import { queueUbicacion } from "@/lib/offline/queueRepository";
import { calcularDesvio } from "@/lib/geo/deviation";
import { detectarLlegadas, type EmpresaConGeofence } from "@/lib/geo/geofence";
import { INTERVALO_TRACKING_MS } from "@/lib/constants";
import { useOnlineStatus } from "./useOnlineStatus";

interface UseGeolocationTrackingParams {
  vendedorId: string;
  jornadaId: string | null;
  polylinePlanificada: string | null;
  empresasPendientes: EmpresaConGeofence[];
  onDesvioDetectado: (distanciaMetros: number, ubicacion: [number, number]) => void;
  onLlegadaDetectada: (empresaId: string, nombre: string) => void;
}

/** Orquestador central del tracking: captura GPS cada 60s, encola offline, evalúa desvío y geofencing. */
export function useGeolocationTracking({
  vendedorId,
  jornadaId,
  polylinePlanificada,
  empresasPendientes,
  onDesvioDetectado,
  onLlegadaDetectada,
}: UseGeolocationTrackingParams) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { isOnline } = useOnlineStatus();

  const capturarYProcesarPosicion = useCallback(() => {
    if (!jornadaId || !("geolocation" in navigator)) return;

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude, accuracy, speed } = pos.coords;
        const timestampDispositivo = new Date().toISOString();
        const posicionActual: [number, number] = [latitude, longitude];

        await queueUbicacion({
          clientUuid: uuidv4(),
          vendedorId,
          jornadaId,
          lat: latitude,
          lng: longitude,
          precisionMetros: accuracy,
          velocidadKmh: speed ? speed * 3.6 : null,
          timestampDispositivo,
          sincronizado: false,
        });

        if (polylinePlanificada) {
          const resultado = calcularDesvio(posicionActual, polylinePlanificada);
          if (resultado.desviado) onDesvioDetectado(resultado.distanciaMetros, posicionActual);
        }

        detectarLlegadas(posicionActual, empresasPendientes).forEach((e) =>
          onLlegadaDetectada(e.empresaId, e.nombre)
        );
      },
      (error) => console.error("Error obteniendo posición GPS:", error.message),
      { enableHighAccuracy: true, timeout: 20_000, maximumAge: 0 }
    );
  }, [vendedorId, jornadaId, polylinePlanificada, empresasPendientes, onDesvioDetectado, onLlegadaDetectada]);

  useEffect(() => {
    if (!jornadaId) return;

    capturarYProcesarPosicion(); // primer tick inmediato al iniciar jornada/ruta
    intervalRef.current = setInterval(capturarYProcesarPosicion, INTERVALO_TRACKING_MS);

    // El navegador pausa/throttlea el setInterval cuando la pestaña queda en segundo
    // plano (cambio de app, pantalla bloqueada). No hay forma de evitarlo desde una
    // página web — pero en cuanto el vendedor vuelve a la app, capturamos posición
    // de inmediato en vez de esperar hasta el próximo tick de 60s, para minimizar
    // el hueco en el recorrido registrado.
    function handleVisibility() {
      if (document.visibilityState === "visible") capturarYProcesarPosicion();
    }
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [jornadaId, capturarYProcesarPosicion]);

  return { isOnline };
}
