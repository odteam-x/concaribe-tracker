"use client";
import { useEffect, useState } from "react";
import { GoogleMap, HeatmapLayerF } from "@react-google-maps/api";
import { useGoogleMaps } from "./GoogleMapProvider";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useUbicacionNavegador } from "@/hooks/useUbicacionNavegador";
import { SolicitarUbicacionBanner } from "@/components/shared/SolicitarUbicacionBanner";

const CENTRO_DEFAULT = { lat: 18.4861, lng: -69.9312 }; // Santo Domingo, RD — fallback si no hay ubicación

export function HeatmapLayer({ desde, hasta, vendedorId }: { desde: string; hasta: string; vendedorId?: string }) {
  const { isLoaded } = useGoogleMaps();
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [puntos, setPuntos] = useState<{ lat: number; lng: number }[]>([]);
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

  if (!isLoaded) return <div className="p-6 text-slate-500">Cargando mapa...</div>;

  const weightedData = puntos.map((p) => ({
    location: new google.maps.LatLng(p.lat, p.lng),
    weight: 1,
  }));

  return (
    <div>
      <SolicitarUbicacionBanner />
      <GoogleMap
        mapContainerClassName="h-[70vh] w-full rounded-lg"
        center={CENTRO_DEFAULT}
        zoom={12}
        onLoad={(m) => setMap(m)}
      >
        <HeatmapLayerF data={weightedData} options={{ radius: 25 }} />
      </GoogleMap>
    </div>
  );
}
