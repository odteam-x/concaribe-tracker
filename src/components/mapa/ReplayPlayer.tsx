"use client";
import { useEffect, useMemo, useState } from "react";
import { GoogleMap, MarkerF, PolylineF } from "@react-google-maps/api";
import { useGoogleMaps } from "./GoogleMapProvider";
import { supabaseBrowser } from "@/lib/supabase/client";

interface PuntoTrack {
  lat: number;
  lng: number;
  timestamp: string;
}

function parsePunto(valor: string): [number, number] {
  const match = /POINT\(([-\d.]+) ([-\d.]+)\)/.exec(valor);
  if (!match) return [0, 0];
  return [parseFloat(match[1]), parseFloat(match[2])];
}

/** Anima el recorrido real (ubicaciones) de un vendedor en una fecha dada. */
export function ReplayPlayer({ vendedorId, fecha }: { vendedorId: string; fecha: string }) {
  const { isLoaded } = useGoogleMaps();
  const [track, setTrack] = useState<PuntoTrack[]>([]);
  const [indice, setIndice] = useState(0);
  const [reproduciendo, setReproduciendo] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabaseBrowser
        .from("ubicaciones")
        .select("punto, timestamp_dispositivo")
        .eq("vendedor_id", vendedorId)
        .gte("timestamp_dispositivo", `${fecha}T00:00:00`)
        .lte("timestamp_dispositivo", `${fecha}T23:59:59`)
        .order("timestamp_dispositivo", { ascending: true });

      const puntos = (data ?? []).map((f) => {
        const [lng, lat] = parsePunto(f.punto as string);
        return { lat, lng, timestamp: f.timestamp_dispositivo as string };
      });
      setTrack(puntos);
      setIndice(0);
    })();
  }, [vendedorId, fecha]);

  useEffect(() => {
    if (!reproduciendo) return;
    const id = setInterval(() => {
      setIndice((i) => {
        if (i >= track.length - 1) {
          setReproduciendo(false);
          return i;
        }
        return i + 1;
      });
    }, 300);
    return () => clearInterval(id);
  }, [reproduciendo, track.length]);

  const posicionActual = track[indice];
  const path = useMemo(() => track.map((p) => ({ lat: p.lat, lng: p.lng })), [track]);

  if (!isLoaded) return <div className="p-6 text-slate-500">Cargando mapa...</div>;
  if (track.length === 0) return <p className="text-slate-500">No hay recorrido registrado para esta fecha.</p>;

  return (
    <div>
      <GoogleMap mapContainerClassName="h-[60vh] w-full rounded-lg" center={path[0]} zoom={13}>
        <PolylineF path={path} options={{ strokeColor: "#1B3A6B", strokeWeight: 3 }} />
        {posicionActual && <MarkerF position={posicionActual} />}
      </GoogleMap>
      <div className="mt-4 flex items-center gap-4">
        <button
          onClick={() => setReproduciendo((r) => !r)}
          className="rounded-md bg-marca-azul px-4 py-2 text-sm font-medium text-white"
        >
          {reproduciendo ? "Pausar" : "Reproducir"}
        </button>
        <input
          type="range"
          min={0}
          max={track.length - 1}
          value={indice}
          onChange={(e) => setIndice(Number(e.target.value))}
          className="flex-1"
        />
        <span className="text-sm text-slate-500">
          {posicionActual && new Date(posicionActual.timestamp).toLocaleTimeString()}
        </span>
      </div>
    </div>
  );
}
