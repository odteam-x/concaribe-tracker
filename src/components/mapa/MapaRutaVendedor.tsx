"use client";
import { useEffect, useRef, useState } from "react";
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

// Rumbo (0-360°) entre dos coordenadas, para rotar la flecha del vendedor como en un GPS.
function calcularRumbo(a: [number, number], b: [number, number]): number {
  const rad = Math.PI / 180;
  const dLng = (b[1] - a[1]) * rad;
  const y = Math.sin(dLng) * Math.cos(b[0] * rad);
  const x =
    Math.cos(a[0] * rad) * Math.sin(b[0] * rad) -
    Math.sin(a[0] * rad) * Math.cos(b[0] * rad) * Math.cos(dLng);
  return (Math.atan2(y, x) * (180 / Math.PI) + 360) % 360;
}

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
  const [rumbo, setRumbo] = useState(0);
  const prevPos = useRef<[number, number] | null>(null);

  // Modo seguimiento tipo navegación: el mapa se mantiene centrado en el vendedor
  // a medida que se mueve, y la flecha apunta hacia donde avanza.
  useEffect(() => {
    if (!posicionActual) return;
    if (prevPos.current) {
      const [plat, plng] = prevPos.current;
      const movio = Math.abs(plat - posicionActual[0]) > 1e-6 || Math.abs(plng - posicionActual[1]) > 1e-6;
      if (movio) setRumbo(calcularRumbo(prevPos.current, posicionActual));
    }
    prevPos.current = posicionActual;

    if (modoSeguimiento && map) {
      map.panTo({ lat: posicionActual[0], lng: posicionActual[1] });
    }
  }, [modoSeguimiento, map, posicionActual]);

  if (!isLoaded) return <div className="p-6 text-slate-500">Cargando mapa...</div>;

  const path = polyline ? decodePolyline(polyline).map(([lat, lng]) => ({ lat, lng })) : [];
  const centro = posicionActual ? { lat: posicionActual[0], lng: posicionActual[1] } : path[0] ?? CENTRO_DEFAULT;

  return (
    <GoogleMap
      mapContainerClassName={modoSeguimiento ? "h-[55vh] w-full rounded-lg" : "h-[45vh] w-full rounded-lg"}
      center={centro}
      zoom={modoSeguimiento ? 18 : 13}
      onLoad={(m) => setMap(m)}
      options={{
        disableDefaultUI: modoSeguimiento,
        zoomControl: true,
        gestureHandling: "greedy",
        clickableIcons: false,
      }}
    >
      {path.length > 1 && (
        <PolylineF path={path} options={{ strokeColor: "#1B3A6B", strokeWeight: 6, strokeOpacity: 0.85 }} />
      )}
      {empresas.map((e) => {
        const esSiguiente = e.id === siguienteId;
        return (
          <MarkerF
            key={e.id}
            position={{ lat: e.lat, lng: e.lng }}
            title={e.nombre}
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
            scale: 7,
            fillColor: "#2E5391",
            fillOpacity: 1,
            strokeWeight: 2,
            strokeColor: "#fff",
            rotation: rumbo, // apunta hacia la dirección de avance
          }}
        />
      )}
    </GoogleMap>
  );
}
