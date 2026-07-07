import type { CapacitorConfig } from "@capacitor/cli";

// La APK es un "envoltorio" nativo que carga el sitio real desplegado en Vercel
// (server.url). Así el sitio web sigue funcionando por su cuenta y la app móvil
// muestra exactamente lo mismo, pero con acceso a capacidades nativas como la
// geolocalización en segundo plano.
const config: CapacitorConfig = {
  appId: "com.concaribe.tracker",
  appName: "Concaribe Tracker",
  webDir: "public",
  server: {
    url: "https://concaribe-tracker.vercel.app",
    cleartext: false,
  },
};

export default config;
