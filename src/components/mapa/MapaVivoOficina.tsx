"use client";
import { useEffect, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Tooltip } from "react-leaflet";
import { useSupabaseRealtime } from "@/hooks/useSupabaseRealtime";
import { supabaseBrowser } from "@/lib/supabase/client";
import "leaflet/dist/leaflet.css";

interface PosicionVendedor {
  vendedorId: string;
  nombre: string;
  lat: number;
  lng: number;
}

const CENTRO_DEFAULT: [number, number] = [21.1619, -86.8515]; // Cancún, ajustar a la zona de operación real

export function MapaVivoOficina() {
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

  return (
    <MapContainer center={CENTRO_DEFAULT} zoom={12} className="h-[70vh] w-full rounded-lg">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {Object.values(posiciones).map((p) => (
        <CircleMarker
          key={p.vendedorId}
          center={[p.lat, p.lng]}
          radius={9}
          pathOptions={{ color: "#fff", weight: 2, fillColor: "#1B3A6B", fillOpacity: 1 }}
        >
          <Tooltip>{p.nombre}</Tooltip>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}

// PostGIS geography(Point) llega serializado como WKT/EWKT según el select;
// esta función soporta el formato "POINT(lng lat)" devuelto al castear a text.
function parsePunto(valor: string): [number, number] {
  const match = /POINT\(([-\d.]+) ([-\d.]+)\)/.exec(valor);
  if (!match) return [0, 0];
  return [parseFloat(match[1]), parseFloat(match[2])];
}
