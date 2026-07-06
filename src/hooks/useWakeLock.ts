"use client";
import { useEffect, useRef } from "react";

/**
 * Evita que la pantalla se apague sola mientras hay una ruta activa, para que el
 * tracking GPS no se interrumpa por el bloqueo automático del celular. El Wake Lock
 * se libera solo si la pestaña pierde visibilidad (cambio de app, apagado manual de
 * pantalla) — cuando el vendedor regresa, se vuelve a pedir automáticamente.
 *
 * No sustituye el tracking en segundo plano real (eso requeriría una app nativa,
 * ver useGeolocationTracking.ts): esto solo ayuda a que, mientras el vendedor tiene
 * la app abierta y activa, la pantalla no se apague y corte el GPS de forma innecesaria.
 */
export function useWakeLock(activo: boolean) {
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    if (!activo || !("wakeLock" in navigator)) return;

    let cancelado = false;

    async function solicitar() {
      try {
        const lock = await navigator.wakeLock.request("screen");
        if (cancelado) {
          lock.release().catch(() => {});
          return;
        }
        wakeLockRef.current = lock;
      } catch {
        // Falla silenciosa (batería baja, permiso denegado, no soportado): no debe romper la app.
      }
    }

    solicitar();

    function handleVisibility() {
      if (document.visibilityState === "visible" && !wakeLockRef.current) {
        void solicitar();
      }
    }
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      cancelado = true;
      document.removeEventListener("visibilitychange", handleVisibility);
      wakeLockRef.current?.release().catch(() => {});
      wakeLockRef.current = null;
    };
  }, [activo]);
}
