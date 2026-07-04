"use client";
import { useCallback, useEffect, useState } from "react";

export type EstadoPermisoUbicacion = "granted" | "denied" | "prompt" | "no-soportado" | "verificando";

/**
 * Pide y trackea la ubicación del navegador de forma explícita (a diferencia de los
 * getCurrentPosition() puntuales que ya disparan el permiso implícitamente en check-in/
 * visita/tracking). Sirve tanto para el banner de "Activar ubicación" (vendedor) como
 * para mostrar la posición propia del usuario de oficina en el mapa en vivo, a modo de
 * confirmación visual de que la geolocalización del navegador está funcionando.
 */
export function useUbicacionNavegador({ activo = true }: { activo?: boolean } = {}) {
  const [posicion, setPosicion] = useState<{ lat: number; lng: number } | null>(null);
  const [permiso, setPermiso] = useState<EstadoPermisoUbicacion>("verificando");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setPermiso("no-soportado");
      return;
    }
    if (!("permissions" in navigator)) {
      setPermiso("prompt");
      return;
    }
    let status: PermissionStatus | null = null;
    navigator.permissions
      .query({ name: "geolocation" as PermissionName })
      .then((s) => {
        status = s;
        setPermiso(s.state as EstadoPermisoUbicacion);
        s.onchange = () => setPermiso(s.state as EstadoPermisoUbicacion);
      })
      .catch(() => setPermiso("prompt"));
    return () => {
      if (status) status.onchange = null;
    };
  }, []);

  const solicitar = useCallback(() => {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosicion({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setPermiso("granted");
        setError(null);
      },
      (err) => {
        setError(err.message);
        if (err.code === err.PERMISSION_DENIED) setPermiso("denied");
      },
      { enableHighAccuracy: true }
    );
  }, []);

  useEffect(() => {
    if (!activo || permiso !== "granted" || !("geolocation" in navigator)) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => setPosicion({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => setError(err.message),
      { enableHighAccuracy: true }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [activo, permiso]);

  return { posicion, permiso, error, solicitar };
}
