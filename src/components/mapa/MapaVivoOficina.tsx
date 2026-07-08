"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { GoogleMap, MarkerF, PolylineF, InfoWindowF } from "@react-google-maps/api";
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
  ultima: string;
}
interface RutaVendedor {
  vendedorId: string;
  nombre: string;
  polyline: string;
  color: string;
}
interface PuntoFijo {
  id: string;
  nombre: string;
  lat: number;
  lng: number;
  direccion?: string | null;
  categoria?: string | null;
  extra?: string | null;
}
type Seleccion = { lat: number; lng: number; titulo: string; lineas: string[] } | null;

const CENTRO_DEFAULT = { lat: 18.4861, lng: -69.9312 };
const COLORES = ["#1B3A6B", "#D97706", "#7C3AED", "#0D9488", "#DB2777", "#2563EB", "#65A30D", "#DC2626"];
const COLOR_CATEGORIA: Record<string, string> = {
  empresa: "#7C3AED",
  almacen: "#D97706",
  local: "#0D9488",
  otro: "#64748B",
};
const MIN_ACTIVO = 4;

export function MapaVivoOficina() {
  const { isLoaded } = useGoogleMaps();
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [vendedores, setVendedores] = useState<VendedorVivo[]>([]);
  const [rutas, setRutas] = useState<RutaVendedor[]>([]);
  const [clientes, setClientes] = useState<PuntoFijo[]>([]);
  const [referencias, setReferencias] = useState<PuntoFijo[]>([]);
  const [siguiendo, setSiguiendo] = useState<string | null>(null);
  const [seleccion, setSeleccion] = useState<Seleccion>(null);
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

  // Clientes y puntos de referencia (con su descripción para la ventana de info).
  useEffect(() => {
    (async () => {
      const [{ data: emp }, { data: ref }] = await Promise.all([
        supabaseBrowser.from("empresas").select("id, nombre, direccion, telefono, categoria, lat, lng").not("lat", "is", null).limit(2000),
        supabaseBrowser.from("ubicaciones_referencia").select("id, nombre, categoria, direccion, notas, lat, lng").not("lat", "is", null),
      ]);
      setClientes((emp ?? []).map((e: any) => ({ id: e.id, nombre: e.nombre, lat: e.lat, lng: e.lng, direccion: e.direccion, categoria: e.categoria, extra: e.telefono })));
      setReferencias((ref ?? []).map((r: any) => ({ id: r.id, nombre: r.nombre, lat: r.lat, lng: r.lng, direccion: r.direccion, categoria: r.categoria, extra: r.notas })));
    })();
  }, []);

  // Posiciones de vendedores + rutas en curso: refresco cada 5s.
  const cargarVivo = useCallback(async () => {
    const hoy = new Date().toISOString().slice(0, 10);
    const [{ data: ubic }, { data: rutasData }] = await Promise.all([
      supabaseBrowser
        .from("ubicaciones")
        .select("vendedor_id, lat, lng, timestamp_dispositivo, usuarios(nombre)")
        .order("timestamp_dispositivo", { ascending: false })
        .limit(500),
      supabaseBrowser
        .from("rutas")
        .select("vendedor_id, polyline, usuarios(nombre)")
        .eq("fecha", hoy)
        .eq("estado", "en_curso"),
    ]);

    // Rutas en curso SIEMPRE visibles (no dependen de que la posición sea reciente).
    setRutas(
      (rutasData ?? [])
        .filter((r: any) => r.polyline)
        .map((r: any) => ({
          vendedorId: r.vendedor_id,
          nombre: r.usuarios?.nombre ?? "Vendedor",
          polyline: r.polyline,
          color: color(r.vendedor_id),
        }))
    );

    const ahora = Date.now();
    const vistos = new Set<string>();
    const lista: VendedorVivo[] = [];
    for (const f of (ubic ?? []) as any[]) {
      if (vistos.has(f.vendedor_id) || f.lat == null) continue;
      vistos.add(f.vendedor_id);
      if ((ahora - new Date(f.timestamp_dispositivo).getTime()) / 60000 >= MIN_ACTIVO) continue;
      lista.push({
        vendedorId: f.vendedor_id,
        nombre: f.usuarios?.nombre ?? "Vendedor",
        lat: f.lat,
        lng: f.lng,
        color: color(f.vendedor_id),
        ultima: f.timestamp_dispositivo,
      });
    }
    setVendedores(lista);
  }, [color]);

  useEffect(() => {
    void cargarVivo();
    const id = setInterval(() => void cargarVivo(), 5000);
    return () => clearInterval(id);
  }, [cargarVivo]);

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
        onClick={() => setSeleccion(null)}
      >
        {/* Rutas en curso (línea que el vendedor debe seguir), siempre visibles */}
        {rutas.map((r) => (
          <PolylineF
            key={r.vendedorId}
            path={decodePolyline(r.polyline).map(([lat, lng]) => ({ lat, lng }))}
            options={{ strokeColor: r.color, strokeWeight: 5, strokeOpacity: 0.85 }}
          />
        ))}

        {/* Clientes (clickeables) */}
        {clientes.map((c) => (
          <MarkerF
            key={c.id}
            position={{ lat: c.lat, lng: c.lng }}
            title={c.nombre}
            onClick={() =>
              setSeleccion({
                lat: c.lat,
                lng: c.lng,
                titulo: c.nombre,
                lineas: [
                  "Cliente",
                  c.categoria ? `Categoría: ${c.categoria}` : "",
                  c.direccion ? c.direccion : "",
                  c.extra ? `Tel: ${c.extra}` : "",
                ].filter(Boolean),
              })
            }
            icon={{ path: google.maps.SymbolPath.CIRCLE, scale: 5, fillColor: "#94A3B8", fillOpacity: 0.9, strokeWeight: 1, strokeColor: "#fff" }}
          />
        ))}

        {/* Ubicaciones de referencia (clickeables) */}
        {referencias.map((r) => (
          <MarkerF
            key={r.id}
            position={{ lat: r.lat, lng: r.lng }}
            title={r.nombre}
            onClick={() =>
              setSeleccion({
                lat: r.lat,
                lng: r.lng,
                titulo: r.nombre,
                lineas: [
                  r.categoria ? `Categoría: ${r.categoria}` : "Ubicación",
                  r.direccion ? r.direccion : "",
                  r.extra ? r.extra : "",
                ].filter(Boolean),
              })
            }
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

        {/* Vendedores en línea */}
        {vendedores.map((v) => (
          <MarkerF
            key={v.vendedorId}
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
        ))}

        {/* Tu ubicación (oficina) */}
        {miPosicion && (
          <MarkerF
            position={miPosicion}
            title="Tú (oficina)"
            icon={{ path: google.maps.SymbolPath.CIRCLE, scale: 9, fillColor: "#A9C93B", fillOpacity: 1, strokeWeight: 3, strokeColor: "#fff" }}
          />
        )}

        {/* Ventana de información del punto seleccionado */}
        {seleccion && (
          <InfoWindowF position={{ lat: seleccion.lat, lng: seleccion.lng }} onCloseClick={() => setSeleccion(null)}>
            <div className="max-w-[220px] text-sm">
              <p className="font-semibold text-marca-azul">{seleccion.titulo}</p>
              {seleccion.lineas.map((l, i) => (
                <p key={i} className="text-slate-600">
                  {l}
                </p>
              ))}
            </div>
          </InfoWindowF>
        )}
      </GoogleMap>

      <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
        <span>Se actualiza cada 5s · gris = clientes · colores = referencias · líneas = rutas en curso. Haz clic en un punto para ver su info.</span>
        {!miPosicion && miPermiso !== "denied" && (
          <button onClick={solicitarMiUbicacion} className="font-medium text-marca-azul underline">
            Mostrar mi ubicación
          </button>
        )}
      </div>
    </div>
  );
}
