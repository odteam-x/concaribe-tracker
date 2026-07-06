"use client";
import { useEffect, useRef, useState } from "react";
import { GoogleMap } from "@react-google-maps/api";
import { useGoogleMaps } from "./GoogleMapProvider";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useUbicacionNavegador } from "@/hooks/useUbicacionNavegador";
import { SolicitarUbicacionBanner } from "@/components/shared/SolicitarUbicacionBanner";

const CENTRO_DEFAULT = { lat: 18.4861, lng: -69.9312 }; // Santo Domingo, RD — fallback si no hay ubicación

export function HeatmapLayer({ desde, hasta, vendedorId }: { desde: string; hasta: string; vendedorId?: string }) {
  const { isLoaded } = useGoogleMaps();
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [puntos, setPuntos] = useState<{ lat: number; lng: number }[]>([]);
  const heatRef = useRef<google.maps.visualization.HeatmapLayer | null>(null);
  const { posicion: miPosicion, solicitar: solicitarMiUbicacion } = useUbicacionNavegador();

  useEffect(() => {
    solicitarMiUbicacion();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (map && miPosicion) map.panTo(miPosicion);
  }, [map, miPosicion]);

  useEffect(() => {
    (async () => {
      const { data } = await supabaseBrowser.rpc("fn_heatmap_visitas", {
        p_desde: desde,
        p_hasta: hasta,
        p_vendedor_id: vendedorId ?? null,
      });
      setPuntos((data ?? []) as { lat: number; lng: number }[]);
    })();
  }, [desde, hasta, vendedorId]);

  // Construcción imperativa del heatmap con guardas: si la librería 'visualization'
  // no está disponible, simplemente no dibuja la capa en vez de tumbar toda la página.
  useEffect(() => {
    if (!map || typeof google === "undefined" || !google.maps?.visualization) return;

    heatRef.current?.setMap(null);
    try {
      const data = puntos
        .filter((p) => p.lat != null && p.lng != null)
        .map((p) => new google.maps.LatLng(p.lat, p.lng));
      heatRef.current = new google.maps.visualization.HeatmapLayer({ data, radius: 25 });
      heatRef.current.setMap(map);
    } catch (err) {
      console.error("No se pudo dibujar el heatmap:", err);
    }

    return () => heatRef.current?.setMap(null);
  }, [map, puntos]);

  if (!isLoaded) return <div className="p-6 text-slate-500">Cargando mapa...</div>;

  return (
    <div>
      <SolicitarUbicacionBanner />
      {puntos.length === 0 && (
        <p className="mb-2 text-sm text-slate-500">
          Aún no hay visitas registradas en el rango seleccionado para mostrar en el mapa de calor.
        </p>
      )}
      <GoogleMap mapContainerClassName="h-[70vh] w-full rounded-lg" center={CENTRO_DEFAULT} zoom={12} onLoad={(m) => setMap(m)} />
    </div>
  );
}
