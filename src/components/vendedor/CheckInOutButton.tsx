"use client";
import { useJornadaActiva } from "@/hooks/useJornadaActiva";

export function CheckInOutButton({ vendedorId }: { vendedorId: string }) {
  const { jornada, enCurso, cargando, checkIn, checkOut } = useJornadaActiva(vendedorId);

  function conUbicacion(fn: (lat: number, lng: number) => Promise<void>) {
    navigator.geolocation.getCurrentPosition(
      (pos) => void fn(pos.coords.latitude, pos.coords.longitude),
      () => void fn(0, 0)
    );
  }

  if (cargando) return <div className="h-14 animate-pulse rounded-md bg-slate-200" />;

  if (!jornada || jornada.checkOut) {
    return (
      <button
        onClick={() => conUbicacion(checkIn)}
        className="w-full rounded-md bg-marca-lima-oscuro px-4 py-3 font-medium text-white"
      >
        Check-in de jornada
      </button>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-slate-600">
        Jornada iniciada a las {new Date(jornada.checkIn).toLocaleTimeString()}
      </p>
      {enCurso && (
        <button
          onClick={() => conUbicacion(checkOut)}
          className="w-full rounded-md bg-estado-desviado px-4 py-3 font-medium text-white"
        >
          Check-out de jornada
        </button>
      )}
    </div>
  );
}
