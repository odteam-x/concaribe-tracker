"use client";
import { useEffect, useState } from "react";
import { GoogleMap, MarkerF } from "@react-google-maps/api";
import { useGoogleMaps } from "./GoogleMapProvider";
import { useSupabaseRealtime } from "@/hooks/useSupabaseRealtime";
import { supabaseBrowser } from "@/lib/supabase/client";

interface PosicionVendedor {
  vendedorId: string;
  nombre: string;
  lat: number;
  lng: number;
}

const CENTRO_DEFAULT = { lat: 21.1619, lng: -86.8515 }; // Cancún, ajustar a la zona de operación real

export function MapaVivoOficina() {
  const { isLoaded } = useGoogleMaps();
  const [posiciones, setPosiciones] = useState<Record<string, PosicionVendedor>>({});

  useEffect(() => {
    let activo = true;
    (async () => {
      const { data } = await supabaseBrowser
        .from("ubicaciones")
        .select("vendedor_id, punto, timestamp_dispositivo, usuarios(nombre)")
        .order("timestamp_dispositivo", { ascending: false })
        .limit(200);

      if (!activo || !data) return;
      const ultimaPorVendedor: Record<string, PosicionVendedor> = {};
      for (const fila of data as any[]) {
        if (ultimaPorVendedor[fila.vendedor_id]) continue;
        const [lng, lat] = parsePunto(fila.punto);
        ultimaPorVendedor[fila.vendedor_id] = {
          vendedorId: fila.vendedor_id,
          nombre: fila.usuarios?.nombre ?? "Vendedor",
          lat,
          lng,
        };
      }
      setPosiciones(ultimaPorVendedor);
    })();
    return () => {
      activo = false;
    };
  }, []);

  useSupabaseRealtime<{ vendedor_id: string; punto: string }>(
    "ubicaciones:oficina",
    "ubicaciones",
    undefined,
    (payload) => {
      const nueva = payload.new as { vendedor_id: string; punto: string } | undefined;
      if (!nueva) return;
      const [lng, lat] = parsePunto(nueva.punto);
      setPosiciones((prev) => ({
        ...prev,
        [nueva.vendedor_id]: { vendedorId: nueva.vendedor_id, nombre: prev[nueva.vendedor_id]?.nombre ?? "Vendedor", lat, lng },
      }));
    }
  );

  if (!isLoaded) return <div className="p-6 text-slate-500">Cargando mapa...</div>;

  return (
    <GoogleMap mapContainerClassName="h-[70vh] w-full rounded-lg" center={CENTRO_DEFAULT} zoom={12}>
      {Object.values(posiciones).map((p) => (
        <MarkerF key={p.vendedorId} position={{ lat: p.lat, lng: p.lng }} title={p.nombre} />
      ))}
    </GoogleMap>
  );
}

// PostGIS geography(Point) llega serializado como WKT/EWKT o GeoJSON según el select;
// esta función soporta el formato "POINT(lng lat)" devuelto al castear a text.
function parsePunto(valor: string): [number, number] {
  const match = /POINT\(([-\d.]+) ([-\d.]+)\)/.exec(valor);
  if (!match) return [0, 0];
  return [parseFloat(match[1]), parseFloat(match[2])];
}
