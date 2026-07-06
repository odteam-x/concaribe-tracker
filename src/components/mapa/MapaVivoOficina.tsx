"use client";
import { useEffect, useState } from "react";
import { GoogleMap, MarkerF } from "@react-google-maps/api";
import { useGoogleMaps } from "./GoogleMapProvider";
import { useSupabaseRealtime } from "@/hooks/useSupabaseRealtime";
import { useUbicacionNavegador } from "@/hooks/useUbicacionNavegador";
import { supabaseBrowser } from "@/lib/supabase/client";
import { SolicitarUbicacionBanner } from "@/components/shared/SolicitarUbicacionBanner";

interface PosicionVendedor {
  vendedorId: string;
  nombre: string;
  lat: number;
  lng: number;
}

interface UbicacionReferencia {
  id: string;
  nombre: string;
  categoria: string;
  lat: number;
  lng: number;
}

const CENTRO_DEFAULT = { lat: 18.4861, lng: -69.9312 }; // Santo Domingo, RD — fallback si no hay ubicación

const COLOR_CATEGORIA: Record<string, string> = {
  empresa: "#7C3AED",
  almacen: "#D97706",
  local: "#0D9488",
  otro: "#64748B",
};

export function MapaVivoOficina() {
  const { isLoaded } = useGoogleMaps();
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [posiciones, setPosiciones] = useState<Record<string, PosicionVendedor>>({});
  const [ubicacionesRef, setUbicacionesRef] = useState<UbicacionReferencia[]>([]);
  // Ubicación del propio navegador de oficina: recentra el mapa ahí al abrir (en vez
  // de un centro fijo), y de paso confirma visualmente que el GPS funciona.
  const { posicion: miPosicion, permiso: miPermiso, solicitar: solicitarMiUbicacion } = useUbicacionNavegador();

  useEffect(() => {
    solicitarMiUbicacion();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (map && miPosicion) map.panTo(miPosicion);
  }, [map, miPosicion]);

  useEffect(() => {
    let activo = true;
    (async () => {
      const { data } = await supabaseBrowser
        .from("ubicaciones")
        .select("vendedor_id, lat, lng, timestamp_dispositivo, usuarios(nombre)")
        .order("timestamp_dispositivo", { ascending: false })
        .limit(200);

      if (!activo || !data) return;
      const ultimaPorVendedor: Record<string, PosicionVendedor> = {};
      for (const fila of data as any[]) {
        if (ultimaPorVendedor[fila.vendedor_id]) continue;
        ultimaPorVendedor[fila.vendedor_id] = {
          vendedorId: fila.vendedor_id,
          nombre: fila.usuarios?.nombre ?? "Vendedor",
          lat: fila.lat,
          lng: fila.lng,
        };
      }
      setPosiciones(ultimaPorVendedor);
    })();

    (async () => {
      const { data } = await supabaseBrowser.from("ubicaciones_referencia").select("id, nombre, categoria, lat, lng");
      if (!activo || !data) return;
      setUbicacionesRef(
        (data as any[]).map((u) => ({ id: u.id, nombre: u.nombre, categoria: u.categoria, lat: u.lat, lng: u.lng }))
      );
    })();

    return () => {
      activo = false;
    };
  }, []);

  useSupabaseRealtime<{ vendedor_id: string; lat: number; lng: number }>(
    "ubicaciones:oficina",
    "ubicaciones",
    undefined,
    (payload) => {
      const nueva = payload.new as { vendedor_id: string; lat: number; lng: number } | undefined;
      if (!nueva || nueva.lat == null) return;
      setPosiciones((prev) => ({
        ...prev,
        [nueva.vendedor_id]: {
          vendedorId: nueva.vendedor_id,
          nombre: prev[nueva.vendedor_id]?.nombre ?? "Vendedor",
          lat: nueva.lat,
          lng: nueva.lng,
        },
      }));
    }
  );

  if (!isLoaded) return <div className="p-6 text-slate-500">Cargando mapa...</div>;

  return (
    <div>
      <SolicitarUbicacionBanner />
      {miPermiso === "granted" && !miPosicion && (
        <p className="mb-2 text-xs text-slate-500">Obteniendo tu ubicación...</p>
      )}
      <GoogleMap
        mapContainerClassName="h-[70vh] w-full rounded-lg"
        center={CENTRO_DEFAULT}
        zoom={12}
        onLoad={(m) => setMap(m)}
      >
        {Object.values(posiciones).map((p) => (
          <MarkerF
            key={p.vendedorId}
            position={{ lat: p.lat, lng: p.lng }}
            title={p.nombre}
            icon={{ path: google.maps.SymbolPath.CIRCLE, scale: 9, fillColor: "#1B3A6B", fillOpacity: 1, strokeWeight: 2, strokeColor: "#fff" }}
          />
        ))}
        {ubicacionesRef.map((u) => (
          <MarkerF
            key={u.id}
            position={{ lat: u.lat, lng: u.lng }}
            title={`${u.nombre} (${u.categoria})`}
            icon={{
              path: google.maps.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: COLOR_CATEGORIA[u.categoria] ?? COLOR_CATEGORIA.otro,
              fillOpacity: 1,
              strokeWeight: 2,
              strokeColor: "#fff",
            }}
          />
        ))}
        {miPosicion && (
          <MarkerF
            position={miPosicion}
            title="Tú (oficina) — confirma que el GPS funciona"
            icon={{ path: google.maps.SymbolPath.CIRCLE, scale: 9, fillColor: "#A9C93B", fillOpacity: 1, strokeWeight: 2, strokeColor: "#fff" }}
          />
        )}
      </GoogleMap>
      {!miPosicion && miPermiso !== "denied" && (
        <button onClick={solicitarMiUbicacion} className="mt-2 text-xs font-medium text-marca-azul underline">
          Mostrar mi ubicación en el mapa
        </button>
      )}
    </div>
  );
}
