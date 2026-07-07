"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { GoogleMap, MarkerF, PolylineF } from "@react-google-maps/api";
import { useGoogleMaps } from "./GoogleMapProvider";
import { supabaseBrowser } from "@/lib/supabase/client";
import { SolicitarUbicacionBanner } from "@/components/shared/SolicitarUbicacionBanner";
import { decodePolyline } from "@/lib/geo/deviation";

interface VendedorVivo {
  vendedorId: string;
  nombre: string;
  lat: number;
  lng: number;
  color: string;
  polyline: string | null; // ruta en curso de hoy (si tiene)
}

const CENTRO_DEFAULT = { lat: 18.4861, lng: -69.9312 }; // Santo Domingo, RD

// Paleta de colores para distinguir la ruta/posición de cada vendedor.
const COLORES = ["#1B3A6B", "#D97706", "#7C3AED", "#0D9488", "#DB2777", "#2563EB", "#65A30D", "#DC2626"];

export function MapaVivoOficina() {
  const { isLoaded } = useGoogleMaps();
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [vendedores, setVendedores] = useState<VendedorVivo[]>([]);
  const [siguiendo, setSiguiendo] = useState<string | null>(null);
  const colorPorVendedor = useRef<Map<string, string>>(new Map());

  const asignarColor = useCallback((vendedorId: string) => {
    const mapa = colorPorVendedor.current;
    if (!mapa.has(vendedorId)) mapa.set(vendedorId, COLORES[mapa.size % COLORES.length]);
    return mapa.get(vendedorId)!;
  }, []);

  // Carga la posición más reciente de cada vendedor + su ruta en curso de hoy.
  const cargar = useCallback(async () => {
    const hoy = new Date().toISOString().slice(0, 10);

    const [{ data: ubic }, { data: rutas }] = await Promise.all([
      supabaseBrowser
        .from("ubicaciones")
        .select("vendedor_id, lat, lng, timestamp_dispositivo, usuarios(nombre)")
        .order("timestamp_dispositivo", { ascending: false })
        .limit(400),
      supabaseBrowser
        .from("rutas")
        .select("vendedor_id, polyline")
        .eq("fecha", hoy)
        .eq("estado", "en_curso"),
    ]);

    const polyPorVendedor = new Map<string, string | null>();
    for (const r of rutas ?? []) polyPorVendedor.set(r.vendedor_id, r.polyline);

    const vistos = new Set<string>();
    const lista: VendedorVivo[] = [];
    for (const fila of (ubic ?? []) as any[]) {
      if (vistos.has(fila.vendedor_id) || fila.lat == null) continue;
      vistos.add(fila.vendedor_id);
      lista.push({
        vendedorId: fila.vendedor_id,
        nombre: fila.usuarios?.nombre ?? "Vendedor",
        lat: fila.lat,
        lng: fila.lng,
        color: asignarColor(fila.vendedor_id),
        polyline: polyPorVendedor.get(fila.vendedor_id) ?? null,
      });
    }
    setVendedores(lista);
  }, [asignarColor]);

  // Refresco cada 5 segundos (además del realtime), como pidió el usuario.
  useEffect(() => {
    void cargar();
    const id = setInterval(() => void cargar(), 5000);
    return () => clearInterval(id);
  }, [cargar]);

  // Si estoy siguiendo a un vendedor, el mapa lo acompaña
  useEffect(() => {
    if (siguiendo && map) {
      const v = vendedores.find((x) => x.vendedorId === siguiendo);
      if (v) map.panTo({ lat: v.lat, lng: v.lng });
    }
  }, [vendedores, siguiendo, map]);

  if (!isLoaded) return <div className="p-6 text-slate-500">Cargando mapa...</div>;

  const centro = vendedores[0] ? { lat: vendedores[0].lat, lng: vendedores[0].lng } : CENTRO_DEFAULT;

  return (
    <div>
      <SolicitarUbicacionBanner />

      {/* Leyenda + seguimiento: color de cada vendedor y clic para centrar el mapa en él */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {vendedores.length === 0 && (
          <span className="text-sm text-slate-400">Ningún vendedor ha reportado ubicación todavía.</span>
        )}
        {vendedores.map((v) => (
          <button
            key={v.vendedorId}
            onClick={() => setSiguiendo(siguiendo === v.vendedorId ? null : v.vendedorId)}
            className={`flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-medium transition ${
              siguiendo === v.vendedorId ? "border-marca-azul bg-marca-azul/10" : "border-slate-300 bg-white"
            }`}
          >
            <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: v.color }} />
            {v.nombre}
            {v.polyline ? "" : " (sin ruta)"}
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
        center={centro}
        zoom={12}
        onLoad={(m) => setMap(m)}
      >
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
                scale: siguiendo === v.vendedorId ? 11 : 9,
                fillColor: v.color,
                fillOpacity: 1,
                strokeWeight: 2,
                strokeColor: "#fff",
                labelOrigin: new google.maps.Point(0, -3),
              }}
            />
          </div>
        ))}
      </GoogleMap>
      <p className="mt-2 text-xs text-slate-400">Se actualiza automáticamente cada 5 segundos.</p>
    </div>
  );
}
