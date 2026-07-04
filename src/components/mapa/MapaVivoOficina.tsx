"use client";
import { useEffect, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Tooltip } from "react-leaflet";
import { useSupabaseRealtime } from "@/hooks/useSupabaseRealtime";
import { useUbicacionNavegador } from "@/hooks/useUbicacionNavegador";
import { supabaseBrowser } from "@/lib/supabase/client";
import { SolicitarUbicacionBanner } from "@/components/shared/SolicitarUbicacionBanner";
import "leaflet/dist/leaflet.css";

interface PosicionVendedor {
  vendedorId: string;
  nombre: string;
  lat: number;
  lng: number;
}

const CENTRO_DEFAULT: [number, number] = [18.4861, -69.9312]; // Santo Domingo, RD — zona de operación de Concaribe

export function MapaVivoOficina() {
  const [posiciones, setPosiciones] = useState<Record<string, PosicionVendedor>>({});
  // Ubicación del propio navegador de oficina, a modo de confirmación visual de que
  // el GPS/geolocalización funciona correctamente (no es tracking de un vendedor).
  const { posicion: miPosicion, permiso: miPermiso, solicitar: solicitarMiUbicacion } = useUbicacionNavegador();

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
    <div>
      <SolicitarUbicacionBanner />
      {miPermiso === "granted" && !miPosicion && (
        <p className="mb-2 text-xs text-slate-500">Obteniendo tu ubicación...</p>
      )}
      <MapContainer center={miPosicion ?? CENTRO_DEFAULT} zoom={12} className="h-[70vh] w-full rounded-lg">
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
        {miPosicion && (
          <CircleMarker
            center={miPosicion}
            radius={9}
            pathOptions={{ color: "#fff", weight: 2, fillColor: "#A9C93B", fillOpacity: 1 }}
          >
            <Tooltip permanent direction="top">
              Tú (oficina) — confirma que el GPS funciona
            </Tooltip>
          </CircleMarker>
        )}
      </MapContainer>
      {!miPosicion && miPermiso !== "denied" && (
        <button
          onClick={solicitarMiUbicacion}
          className="mt-2 text-xs font-medium text-marca-azul underline"
        >
          Mostrar mi ubicación en el mapa (para confirmar que el GPS funciona)
        </button>
      )}
    </div>
  );
}

// PostGIS geography(Point) llega serializado como WKT/EWKT según el select;
// esta función soporta el formato "POINT(lng lat)" devuelto al castear a text.
function parsePunto(valor: string): [number, number] {
  const match = /POINT\(([-\d.]+) ([-\d.]+)\)/.exec(valor);
  if (!match) return [0, 0];
  return [parseFloat(match[1]), parseFloat(match[2])];
}
