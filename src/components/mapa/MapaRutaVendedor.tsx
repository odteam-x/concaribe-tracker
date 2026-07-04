"use client";
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

export function MapaRutaVendedor({
  polyline,
  posicionActual,
  empresas,
}: {
  polyline: string | null;
  posicionActual: [number, number] | null;
  empresas: EmpresaEnMapa[];
}) {
  const { isLoaded } = useGoogleMaps();
  if (!isLoaded) return <div className="p-6 text-slate-500">Cargando mapa...</div>;

  const path = polyline ? decodePolyline(polyline).map(([lat, lng]) => ({ lat, lng })) : [];
  const centro = posicionActual ? { lat: posicionActual[0], lng: posicionActual[1] } : path[0] ?? { lat: 21.1619, lng: -86.8515 };

  return (
    <GoogleMap mapContainerClassName="h-[45vh] w-full rounded-lg" center={centro} zoom={13}>
      {path.length > 1 && <PolylineF path={path} options={{ strokeColor: "#1B3A6B", strokeWeight: 4 }} />}
      {empresas.map((e) => (
        <MarkerF
          key={e.id}
          position={{ lat: e.lat, lng: e.lng }}
          title={e.nombre}
          icon={{
            path: google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: e.visitada ? "#A9C93B" : "#1B3A6B",
            fillOpacity: 1,
            strokeWeight: 0,
          }}
        />
      ))}
      {posicionActual && (
        <MarkerF
          position={{ lat: posicionActual[0], lng: posicionActual[1] }}
          icon={{ path: google.maps.SymbolPath.CIRCLE, scale: 7, fillColor: "#D97706", fillOpacity: 1, strokeWeight: 2, strokeColor: "#fff" }}
        />
      )}
    </GoogleMap>
  );
}
