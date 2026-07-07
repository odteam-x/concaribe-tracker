import { Capacitor, registerPlugin } from "@capacitor/core";

// Wrapper del plugin @capacitor-community/background-geolocation. Solo tiene efecto
// dentro de la app nativa (APK); en el navegador web esNativo() es false y no se usa.
interface Location {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  speed: number | null;
}

interface BackgroundGeolocationPlugin {
  addWatcher(
    options: {
      backgroundMessage: string;
      backgroundTitle: string;
      requestPermissions: boolean;
      stale: boolean;
      distanceFilter: number;
    },
    callback: (location?: Location, error?: { code?: string; message?: string }) => void
  ): Promise<string>;
  removeWatcher(options: { id: string }): Promise<void>;
}

const BackgroundGeolocation = registerPlugin<BackgroundGeolocationPlugin>("BackgroundGeolocation");

export function esNativo(): boolean {
  return Capacitor.isNativePlatform();
}

/**
 * Inicia el seguimiento en segundo plano (con notificación persistente, requisito de
 * Android para no ser matado). Devuelve el id del watcher para poder detenerlo.
 * Cada posición dispara `onLocation`. Best-effort: envuelto en try/catch para nunca
 * romper la app si el plugin no está disponible.
 */
export async function iniciarSeguimientoFondo(
  onLocation: (lat: number, lng: number, precision: number | null, velocidad: number | null) => void
): Promise<string | null> {
  if (!esNativo()) return null;
  try {
    return await BackgroundGeolocation.addWatcher(
      {
        backgroundTitle: "Concaribe Tracker",
        backgroundMessage: "Compartiendo tu ubicación durante la jornada.",
        requestPermissions: true,
        stale: false,
        distanceFilter: 25, // metros mínimos entre reportes
      },
      (location, error) => {
        if (error || !location) return;
        onLocation(location.latitude, location.longitude, location.accuracy, location.speed);
      }
    );
  } catch (e) {
    console.error("No se pudo iniciar el seguimiento en segundo plano:", e);
    return null;
  }
}

export async function detenerSeguimientoFondo(id: string | null): Promise<void> {
  if (!id || !esNativo()) return;
  try {
    await BackgroundGeolocation.removeWatcher({ id });
  } catch (e) {
    console.error("No se pudo detener el seguimiento en segundo plano:", e);
  }
}
