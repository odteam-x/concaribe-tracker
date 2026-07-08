"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { GoogleMap, MarkerF, PolylineF } from "@react-google-maps/api";
import { useGoogleMaps } from "./GoogleMapProvider";
import { useUbicacionNavegador } from "@/hooks/useUbicacionNavegador";
import { supabaseBrowser } from "@/lib/supabase/client";
import { SolicitarUbicacionBanner } from "@/components/shared/SolicitarUbicacionBanner";
import { decodePolyline } from "@/lib/geo/deviation";

interface VendedorVivo {
  vendedorId: string;
  nombre: string;
  lat: number;
  lng: number;
  color: string;
  polyline: string | null;
  ultima: string;
}
interface PuntoFijo {
  id: string;
  nombre: string;
  lat: number;
  lng: number;
  categoria?: string;
}

const CENTRO_DEFAULT = { lat: 18.4861, lng: -69.9312 };
const COLORES = ["#1B3A6B", "#D97706", "#7C3AED", "#0D9488", "#DB2777", "#2563EB", "#65A30D", "#DC2626"];
const COLOR_CATEGORIA: Record<string, string> = {
  empresa: "#7C3AED",
  almacen: "#D97706",
  local: "#0D9488",
  otro: "#64748B",
};
// Un vendedor se considera "en línea" si reportó posición en los últimos 4 minutos.
const MIN_ACTIVO = 4;

export function MapaVivoOficina() {
  const { isLoaded } = useGoogleMaps();
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [vendedores, setVendedores] = useState<VendedorVivo[]>([]);
  const [clientes, setClientes] = useState<PuntoFijo[]>([]);
  const [referencias, setReferencias] = useState<PuntoFijo[]>([]);
  const [siguiendo, setSiguiendo] = useState<string | null>(null);
  const colorRef = useRef<Map<string, string>>(new Map());
  const { posicion: miPosicion, permiso: miPermiso, solicitar: solicitarMiUbicacion } = useUbicacionNavegador();

  const color = useCallback((id: string) => {
    const m = colorRef.current;
    if (!m.has(id)) m.set(id, COLORES[m.size % COLORES.length]);
    return m.get(id)!;
  }, []);

  useEffect(() => {
    solicitarMiUbicacion();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Clientes y puntos de referencia se cargan una vez (cambian poco).
  useEffect(() => {
    (async () => {
      const [{ data: emp }, { data: ref }] = await Promise.all([
        supabaseBrowser.from("empresas").select("id, nombre, lat, lng").not("lat", "is", null).limit(2000),
        supabaseBrowser.from("ubicaciones_referencia").select("id, nombre, categoria, lat, lng").not("lat", "is", null),
      ]);
      setClientes((emp ?? []).map((e: any) => ({ id: e.id, nombre: e.nombre, lat: e.lat, lng: e.lng })));
      setReferencias(
        (ref ?? []).map((r: any) => ({ id: r.id, nombre: r.nombre, lat: r.lat, lng: r.lng, categoria: r.categoria }))
      );
    })();
  }, []);

  // Posición de vendedores + rutas en curso: se refresca cada 5s.
  const cargarVendedores = useCallback(async () => {
    const hoy = new Date().toISOString().slice(0, 10);
    const [{ data: ubic }, { data: rutas }] = await Promise.all([
      supabaseBrowser
        .from("ubicaciones")
        .select("vendedor_id, lat, lng, timestamp_dispositivo, usuarios(nombre)")
        .order("timestamp_dispositivo", { ascending: false })
        .limit(500),
      supabaseBrowser.from("rutas").select("vendedor_id, polyline").eq("fecha", hoy).eq("estado", "en_curso"),
    ]);

    const poly = new Map<string, string | null>();
    for (const r of rutas ?? []) poly.set(r.vendedor_id, r.polyline);

    const ahora = Date.now();
    const vistos = new Set<string>();
    const lista: VendedorVivo[] = [];
    for (const f of (ubic ?? []) as any[]) {
      if (vistos.has(f.vendedor_id) || f.lat == null) continue;
      vistos.add(f.vendedor_id);
      // Solo mostramos vendedores con señal reciente (en línea).
      if ((ahora - new Date(f.timestamp_dispositivo).getTime()) / 60000 >= MIN_ACTIVO) continue;
      lista.push({
        vendedorId: f.vendedor_id,
        nombre: f.usuarios?.nombre ?? "Vendedor",
        lat: f.lat,
        lng: f.lng,
        color: color(f.vendedor_id),
        polyline: poly.get(f.vendedor_id) ?? null,
        ultima: f.timestamp_dispositivo,
      });
    }
    setVendedores(lista);
  }, [color]);

  useEffect(() => {
    void cargarVendedores();
    const id = setInterval(() => void cargarVendedores(), 5000);
    return () => clearInterval(id);
  }, [cargarVendedores]);

  // Centrado: sigue al vendedor seleccionado; si no, centra en la oficina al obtenerla.
  useEffect(() => {
    if (!map) return;
    if (siguiendo) {
      const v = vendedores.find((x) => x.vendedorId === siguiendo);
      if (v) map.panTo({ lat: v.lat, lng: v.lng });
    } else if (miPosicion) {
      map.panTo(miPosicion);
    }
  }, [map, vendedores, siguiendo, miPosicion]);

  if (!isLoaded) return <div className="p-6 text-slate-500">Cargando mapa...</div>;

  return (
    <div>
      <SolicitarUbicacionBanner />

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-slate-600">En línea:</span>
        {vendedores.length === 0 && <span className="text-sm text-slate-400">ningún vendedor en línea ahora.</span>}
        {vendedores.map((v) => (
          <button
            key={v.vendedorId}
            onClick={() => setSiguiendo(siguiendo === v.vendedorId ? null : v.vendedorId)}
            className={`flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-medium ${
              siguiendo === v.vendedorId ? "border-marca-azul bg-marca-azul/10" : "border-slate-300 bg-white"
            }`}
          >
            <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: v.color }} />
            {v.nombre}
          </button>
        ))}
        {siguiendo && (
          <button onClick={() => setSiguiendo(null)} className="text-xs text-slate-500 underline">
            Dejar de seguir
          </button>
        )}
      </div>

      <GoogleMap
        mapContainerClassName="h-[70vh] w-full rounded-lg"
        center={miPosicion ?? CENTRO_DEFAULT}
        zoom={12}
        onLoad={(m) => setMap(m)}
      >
        {/* Clientes de todos los vendedores (siempre visibles) */}
        {clientes.map((c) => (
          <MarkerF
            key={c.id}
            position={{ lat: c.lat, lng: c.lng }}
            title={c.nombre}
            icon={{ path: google.maps.SymbolPath.CIRCLE, scale: 5, fillColor: "#94A3B8", fillOpacity: 0.9, strokeWeight: 1, strokeColor: "#fff" }}
          />
        ))}

        {/* Ubicaciones de referencia (almacenes, locales, etc.) */}
        {referencias.map((r) => (
          <MarkerF
            key={r.id}
            position={{ lat: r.lat, lng: r.lng }}
            title={`${r.nombre}${r.categoria ? ` (${r.categoria})` : ""}`}
            icon={{
              path: google.maps.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: COLOR_CATEGORIA[r.categoria ?? "otro"] ?? COLOR_CATEGORIA.otro,
              fillOpacity: 1,
              strokeWeight: 2,
              strokeColor: "#fff",
            }}
          />
        ))}

        {/* Vendedores en línea + su ruta */}
        {vendedores.map((v) => (
          <div key={v.vendedorId}>
            {v.polyline && (
              <PolylineF
                path={decodePolyline(v.polyline).map(([lat, lng]) => ({ lat, lng }))}
                options={{ strokeColor: v.color, strokeWeight: 5, strokeOpacity: 0.8 }}
              />
            )}
            <MarkerF
              position={{ lat: v.lat, lng: v.lng }}
              title={v.nombre}
              onClick={() => setSiguiendo(v.vendedorId)}
              label={{ text: v.nombre, color: v.color, fontSize: "12px", fontWeight: "bold" }}
              icon={{
                path: google.maps.SymbolPath.CIRCLE,
                scale: siguiendo === v.vendedorId ? 12 : 10,
                fillColor: v.color,
                fillOpacity: 1,
                strokeWeight: 3,
                strokeColor: "#fff",
                labelOrigin: new google.maps.Point(0, -3),
              }}
            />
          </div>
        ))}

        {/* Tu ubicación (oficina) */}
        {miPosicion && (
          <MarkerF
            position={miPosicion}
            title="Tú (oficina)"
            icon={{ path: google.maps.SymbolPath.CIRCLE, scale: 9, fillColor: "#A9C93B", fillOpacity: 1, strokeWeight: 3, strokeColor: "#fff" }}
          />
        )}
      </GoogleMap>

      <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
        <span>Se actualiza cada 5 segundos · gris = clientes · colores = puntos de referencia.</span>
        {!miPosicion && miPermiso !== "denied" && (
          <button onClick={solicitarMiUbicacion} className="font-medium text-marca-azul underline">
            Mostrar mi ubicación
          </button>
        )}
      </div>
    </div>
  );
}
