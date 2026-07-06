"use client";
import { useEffect, useState } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet.heat";
import "leaflet/dist/leaflet.css";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useUbicacionNavegador } from "@/hooks/useUbicacionNavegador";
import { SolicitarUbicacionBanner } from "@/components/shared/SolicitarUbicacionBanner";

const CENTRO_DEFAULT: [number, number] = [18.4861, -69.9312]; // Santo Domingo, RD — fallback si no hay ubicación

function CapaCalor({ puntos }: { puntos: { lat: number; lng: number }[] }) {
  const map = useMap();

  useEffect(() => {
    if (puntos.length === 0) return;
    const capa = L.heatLayer(
      puntos.map((p) => [p.lat, p.lng, 1]),
      { radius: 25 }
    );
    capa.addTo(map);
    return () => {
      map.removeLayer(capa);
    };
  }, [map, puntos]);

  return null;
}

function RecentrarMapa({ centro }: { centro: { lat: number; lng: number } | null }) {
  const map = useMap();
  useEffect(() => {
    if (centro) map.setView([centro.lat, centro.lng], 12);
  }, [centro, map]);
  return null;
}

export function HeatmapLayer({ desde, hasta, vendedorId }: { desde: string; hasta: string; vendedorId?: string }) {
  const [puntos, setPuntos] = useState<{ lat: number; lng: number }[]>([]);
  const { posicion: miPosicion, solicitar: solicitarMiUbicacion } = useUbicacionNavegador();

  useEffect(() => {
    solicitarMiUbicacion();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  return (
    <div>
      <SolicitarUbicacionBanner />
      <MapContainer center={CENTRO_DEFAULT} zoom={12} className="h-[70vh] w-full rounded-lg">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <RecentrarMapa centro={miPosicion} />
        <CapaCalor puntos={puntos} />
      </MapContainer>
    </div>
  );
}
