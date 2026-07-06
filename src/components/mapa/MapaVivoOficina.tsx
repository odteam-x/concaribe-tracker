"use client";
import { useEffect, useState } from "react";
import { GoogleMap, MarkerF, PolylineF } from "@react-google-maps/api";
import { useGoogleMaps } from "./GoogleMapProvider";
import { useSupabaseRealtime } from "@/hooks/useSupabaseRealtime";
import { useUbicacionNavegador } from "@/hooks/useUbicacionNavegador";
import { supabaseBrowser } from "@/lib/supabase/client";
import { SolicitarUbicacionBanner } from "@/components/shared/SolicitarUbicacionBanner";
import { decodePolyline } from "@/lib/geo/deviation";

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

interface RutaSeguida {
  vendedorId: string;
  polyline: string | null;
  paradas: { id: string; nombre: string; lat: number; lng: number; visitada: boolean }[];
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
  const [siguiendo, setSiguiendo] = useState<string | null>(null); // vendedorId seguido
  const [rutaSeguida, setRutaSeguida] = useState<RutaSeguida | null>(null);
  const { posicion: miPosicion, permiso: miPermiso, solicitar: solicitarMiUbicacion } = useUbicacionNavegador();

  useEffect(() => {
    solicitarMiUbicacion();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Solo recentra en mi ubicación si NO estoy siguiendo a un vendedor
  useEffect(() => {
    if (!siguiendo && map && miPosicion) map.panTo(miPosicion);
  }, [map, miPosicion, siguiendo]);

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

  // Al seguir a un vendedor: carga su ruta en curso de hoy (polyline + paradas + visitadas)
  useEffect(() => {
    if (!siguiendo) {
      setRutaSeguida(null);
      return;
    }
    let activo = true;
    (async () => {
      const hoy = new Date().toISOString().slice(0, 10);
      const { data: ruta } = await supabaseBrowser
        .from("rutas")
        .select("id, polyline, orden_visitas")
        .eq("vendedor_id", siguiendo)
        .eq("fecha", hoy)
        .eq("estado", "en_curso")
        .maybeSingle();

      if (!activo) return;
      if (!ruta) {
        setRutaSeguida({ vendedorId: siguiendo, polyline: null, paradas: [] });
        return;
      }

      const [{ data: empresas }, { data: visitas }] = await Promise.all([
        supabaseBrowser.from("empresas").select("id, nombre, lat, lng").in("id", ruta.orden_visitas),
        supabaseBrowser.from("visitas").select("empresa_id").eq("ruta_id", ruta.id),
      ]);
      if (!activo) return;

      const visitadas = new Set((visitas ?? []).map((v) => v.empresa_id));
      setRutaSeguida({
        vendedorId: siguiendo,
        polyline: ruta.polyline,
        paradas: (empresas ?? []).map((e: any) => ({
          id: e.id,
          nombre: e.nombre,
          lat: e.lat,
          lng: e.lng,
          visitada: visitadas.has(e.id),
        })),
      });
    })();
    return () => {
      activo = false;
    };
  }, [siguiendo]);

  // Al activar el seguimiento, centra en el vendedor
  useEffect(() => {
    if (siguiendo && map) {
      const p = posiciones[siguiendo];
      if (p) {
        map.panTo({ lat: p.lat, lng: p.lng });
        map.setZoom(14);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siguiendo, map]);

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
      // Si estoy siguiendo a este vendedor, el mapa lo acompaña en vivo
      if (siguiendo === nueva.vendedor_id && map) {
        map.panTo({ lat: nueva.lat, lng: nueva.lng });
      }
    }
  );

  // Las visitas del vendedor seguido se reflejan en vivo (paradas cambian a verde)
  useSupabaseRealtime<{ empresa_id: string; vendedor_id: string }>(
    "visitas:mapa",
    "visitas",
    undefined,
    (payload) => {
      const v = payload.new as { empresa_id: string; vendedor_id: string } | undefined;
      if (!v || v.vendedor_id !== siguiendo) return;
      setRutaSeguida((prev) =>
        prev
          ? { ...prev, paradas: prev.paradas.map((p) => (p.id === v.empresa_id ? { ...p, visitada: true } : p)) }
          : prev
      );
    }
  );

  if (!isLoaded) return <div className="p-6 text-slate-500">Cargando mapa...</div>;

  const vendedores = Object.values(posiciones);

  return (
    <div>
      <SolicitarUbicacionBanner />

      {/* Barra de seguimiento: un clic sigue al vendedor y muestra su ruta */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-slate-600">Seguir vendedor:</span>
        {vendedores.length === 0 && <span className="text-sm text-slate-400">ninguno ha reportado ubicación aún</span>}
        {vendedores.map((v) => (
          <button
            key={v.vendedorId}
            onClick={() => setSiguiendo(siguiendo === v.vendedorId ? null : v.vendedorId)}
            className={`rounded-full px-3 py-1 text-sm font-medium transition ${
              siguiendo === v.vendedorId
                ? "bg-marca-azul text-white"
                : "border border-slate-300 bg-white text-slate-600 hover:border-marca-azul"
            }`}
          >
            {v.nombre}
          </button>
        ))}
        {siguiendo && (
          <button onClick={() => setSiguiendo(null)} className="text-xs text-slate-500 underline">
            Dejar de seguir
          </button>
        )}
      </div>

      {siguiendo && rutaSeguida && rutaSeguida.paradas.length === 0 && (
        <p className="mb-2 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-700">
          Este vendedor no tiene una ruta en curso ahora mismo — solo se muestra su posición.
        </p>
      )}

      <GoogleMap
        mapContainerClassName="h-[70vh] w-full rounded-lg"
        center={CENTRO_DEFAULT}
        zoom={12}
        onLoad={(m) => setMap(m)}
      >
        {/* Ruta del vendedor seguido */}
        {rutaSeguida?.polyline && (
          <PolylineF
            path={decodePolyline(rutaSeguida.polyline).map(([lat, lng]) => ({ lat, lng }))}
            options={{ strokeColor: "#1B3A6B", strokeWeight: 5, strokeOpacity: 0.75 }}
          />
        )}
        {rutaSeguida?.paradas.map((p, i) => (
          <MarkerF
            key={p.id}
            position={{ lat: p.lat, lng: p.lng }}
            title={p.nombre}
            label={{ text: String(i + 1), color: "#fff", fontSize: "11px", fontWeight: "bold" }}
            icon={{
              path: google.maps.SymbolPath.CIRCLE,
              scale: 10,
              fillColor: p.visitada ? "#A9C93B" : "#1B3A6B",
              fillOpacity: 1,
              strokeWeight: 2,
              strokeColor: "#fff",
            }}
          />
        ))}

        {/* Vendedores (con etiqueta de nombre; el seguido resaltado en naranja) */}
        {vendedores.map((p) => (
          <MarkerF
            key={p.vendedorId}
            position={{ lat: p.lat, lng: p.lng }}
            title={p.nombre}
            onClick={() => setSiguiendo(p.vendedorId)}
            label={{ text: p.nombre, color: "#1B3A6B", fontSize: "12px", fontWeight: "bold", className: "mapa-etiqueta" }}
            icon={{
              path: google.maps.SymbolPath.CIRCLE,
              scale: siguiendo === p.vendedorId ? 11 : 9,
              fillColor: siguiendo === p.vendedorId ? "#D97706" : "#2E5391",
              fillOpacity: 1,
              strokeWeight: 2,
              strokeColor: "#fff",
              labelOrigin: new google.maps.Point(0, -3),
            }}
          />
        ))}

        {/* Puntos de referencia (solo cuando no se sigue a nadie, para no saturar) */}
        {!siguiendo &&
          ubicacionesRef.map((u) => (
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

        {miPosicion && !siguiendo && (
          <MarkerF
            position={miPosicion}
            title="Tú (oficina)"
            icon={{ path: google.maps.SymbolPath.CIRCLE, scale: 9, fillColor: "#A9C93B", fillOpacity: 1, strokeWeight: 2, strokeColor: "#fff" }}
          />
        )}
      </GoogleMap>
      {!miPosicion && miPermiso !== "denied" && !siguiendo && (
        <button onClick={solicitarMiUbicacion} className="mt-2 text-xs font-medium text-marca-azul underline">
          Mostrar mi ubicación en el mapa
        </button>
      )}
    </div>
  );
}
