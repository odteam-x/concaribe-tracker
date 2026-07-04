// Service worker con tres responsabilidades separadas:
// 1) cache de app shell (offline-first) vía install/fetch
// 2) recepción de Web Push (VAPID) vía push/notificationclick
// 3) hint de Background Sync (best-effort, no reemplaza el sync en foreground —
//    ver src/hooks/useOnlineStatus.ts, ya que iOS Safari no soporta esta API)

const CACHE_NAME = "concaribe-shell-v1";
const APP_SHELL = ["/", "/manifest.json", "/icons/icon-192.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Nunca cachear llamadas a la API o a Supabase: siempre red primero, sin fallback a cache
  // (datos de tracking/desvío/visitas deben ser siempre frescos o fallar explícitamente).
  if (url.pathname.startsWith("/api/") || url.hostname.includes("supabase")) return;

  event.respondWith(
    caches.match(event.request).then((cached) => cached ?? fetch(event.request))
  );
});

self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  event.waitUntil(
    self.registration.showNotification(data.title ?? "Concaribe", {
      body: data.body ?? "",
      icon: "/icons/icon-192.png",
      data: { url: data.url ?? "/" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow(event.notification.data?.url ?? "/"));
});

self.addEventListener("sync", (event) => {
  if (event.tag === "sync-ubicaciones") {
    // Best-effort: el sync real y confiable ocurre en foreground (useOnlineStatus.ts)
    event.waitUntil(Promise.resolve());
  }
});
