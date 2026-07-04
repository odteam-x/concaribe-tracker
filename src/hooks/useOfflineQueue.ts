"use client";
import { useEffect, useState } from "react";
import { contarPendientes } from "@/lib/offline/queueRepository";
import { useOnlineStatus } from "./useOnlineStatus";

/** Alimenta el SyncStatusIndicator: cuántos registros siguen pendientes de sincronizar. */
export function useOfflineQueue() {
  const { isOnline } = useOnlineStatus();
  const [pendientes, setPendientes] = useState(0);

  useEffect(() => {
    let activo = true;
    const revisar = async () => {
      const total = await contarPendientes();
      if (activo) setPendientes(total);
    };

    void revisar();
    const interval = setInterval(revisar, 5_000);
    return () => {
      activo = false;
      clearInterval(interval);
    };
  }, [isOnline]);

  return { pendientes, isOnline };
}
