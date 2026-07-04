"use client";
import { useOfflineQueue } from "@/hooks/useOfflineQueue";

export function SyncStatusIndicator() {
  const { pendientes, isOnline } = useOfflineQueue();

  if (isOnline && pendientes === 0) {
    return <span className="text-xs text-marca-lima-oscuro">● En línea</span>;
  }

  return (
    <span className="text-xs text-estado-desviado">
      {isOnline ? `Sincronizando ${pendientes}...` : `Sin conexión — ${pendientes} pendientes`}
    </span>
  );
}
