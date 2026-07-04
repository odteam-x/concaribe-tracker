"use client";
import { useCallback, useEffect, useState } from "react";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

/** Registra el service worker y crea/persiste la suscripción Web Push (VAPID) del usuario. */
export function usePushSubscription() {
  const [suscrito, setSuscrito] = useState(false);
  const [soportado, setSoportado] = useState(false);

  useEffect(() => {
    setSoportado("serviceWorker" in navigator && "PushManager" in window);
  }, []);

  const suscribir = useCallback(async () => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    const registration = await navigator.serviceWorker.register("/sw.js");
    const permiso = await Notification.requestPermission();
    if (permiso !== "granted") return;

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!) as BufferSource,
    });

    await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(subscription.toJSON()),
    });

    setSuscrito(true);
  }, []);

  return { soportado, suscrito, suscribir };
}
