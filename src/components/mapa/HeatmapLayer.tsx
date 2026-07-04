"use client";
import { useEffect, useState } from "react";
import { GoogleMap, HeatmapLayerF } from "@react-google-maps/api";
import { useGoogleMaps } from "./GoogleMapProvider";
import { supabaseBrowser } from "@/lib/supabase/client";

const CENTRO_DEFAULT = { lat: 21.1619, lng: -86.8515 };

export function HeatmapLayer({ desde, hasta, vendedorId }: { desde: string; hasta: string; vendedorId?: string }) {
  const { isLoaded } = useGoogleMaps();
  const [puntos, setPuntos] = useState<{ lat: number; lng: number }[]>([]);

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

  if (!isLoaded || typeof google === "undefined") return <div className="p-6 text-slate-500">Cargando mapa...</div>;

  const weightedData = puntos.map((p) => ({
    location: new google.maps.LatLng(p.lat, p.lng),
    weight: 1,
  }));

  return (
    <GoogleMap mapContainerClassName="h-[70vh] w-full rounded-lg" center={CENTRO_DEFAULT} zoom={12}>
      <HeatmapLayerF data={weightedData} options={{ radius: 25 }} />
    </GoogleMap>
  );
}
