"use client";
import { useEffect, useState } from "react";
import { ejecutarSync } from "@/lib/offline/syncEngine";

/**
 * Detecta reconexión y dispara el sync. Además del evento 'online' (poco
 * confiable en algunos Android), agrega un polling de respaldo cada 30s
 * mientras la app está en foreground.
 */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);

  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      await ejecutarSync();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    const interval = setInterval(async () => {
      if (navigator.onLine) await ejecutarSync();
    }, 30_000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(interval);
    };
  }, []);

  return { isOnline };
}
