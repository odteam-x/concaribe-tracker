"use client";
import { useEffect, useState } from "react";
import { GoogleMap, MarkerF, PolylineF } from "@react-google-maps/api";
import { useGoogleMaps } from "./GoogleMapProvider";
import { decodePolyline } from "@/lib/geo/deviation";

interface EmpresaEnMapa {
  id: string;
  nombre: string;
  lat: number;
  lng: number;
  visitada: boolean;
}

const CENTRO_DEFAULT = { lat: 18.4861, lng: -69.9312 };

export function MapaRutaVendedor({
  polyline,
  posicionActual,
  empresas,
  siguienteId = null,
  modoSeguimiento = false,
}: {
  polyline: string | null;
  posicionActual: [number, number] | null;
  empresas: EmpresaEnMapa[];
  siguienteId?: string | null;
  modoSeguimiento?: boolean;
}) {
  const { isLoaded } = useGoogleMaps();
  const [map, setMap] = useState<google.maps.Map | null>(null);

  // Modo seguimiento tipo navegación: el mapa se mantiene centrado en la posición
  // del vendedor a medida que se mueve (como Uber/Google Maps en ruta).
  useEffect(() => {
    if (modoSeguimiento && map && posicionActual) {
      map.panTo({ lat: posicionActual[0], lng: posicionActual[1] });
    }
  }, [modoSeguimiento, map, posicionActual]);

  if (!isLoaded) return <div className="p-6 text-slate-500">Cargando mapa...</div>;

  const path = polyline ? decodePolyline(polyline).map(([lat, lng]) => ({ lat, lng })) : [];
  const centro = posicionActual ? { lat: posicionActual[0], lng: posicionActual[1] } : path[0] ?? CENTRO_DEFAULT;

  return (
    <GoogleMap
      mapContainerClassName="h-[45vh] w-full rounded-lg"
      center={centro}
      zoom={modoSeguimiento ? 16 : 13}
      onLoad={(m) => setMap(m)}
      options={{ disableDefaultUI: modoSeguimiento, zoomControl: true }}
    >
      {path.length > 1 && <PolylineF path={path} options={{ strokeColor: "#1B3A6B", strokeWeight: 5, strokeOpacity: 0.8 }} />}
      {empresas.map((e) => {
        const esSiguiente = e.id === siguienteId;
        return (
          <MarkerF
            key={e.id}
            position={{ lat: e.lat, lng: e.lng }}
            title={e.nombre}
            label={
              esSiguiente
                ? { text: "➤", color: "#fff", fontSize: "12px" }
                : undefined
            }
            icon={{
              path: google.maps.SymbolPath.CIRCLE,
              scale: esSiguiente ? 11 : 8,
              fillColor: e.visitada ? "#A9C93B" : esSiguiente ? "#D97706" : "#1B3A6B",
              fillOpacity: 1,
              strokeWeight: esSiguiente ? 3 : 0,
              strokeColor: "#fff",
            }}
          />
        );
      })}
      {posicionActual && (
        <MarkerF
          position={{ lat: posicionActual[0], lng: posicionActual[1] }}
          title="Tú"
          icon={{
            path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
            scale: 6,
            fillColor: "#2E5391",
            fillOpacity: 1,
            strokeWeight: 2,
            strokeColor: "#fff",
          }}
        />
      )}
    </GoogleMap>
  );
}
