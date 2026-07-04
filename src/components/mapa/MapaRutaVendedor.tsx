"use client";
import { MapContainer, TileLayer, Polyline, CircleMarker, Tooltip } from "react-leaflet";
import { decodePolyline } from "@/lib/geo/deviation";
import "leaflet/dist/leaflet.css";

interface EmpresaEnMapa {
  id: string;
  nombre: string;
  lat: number;
  lng: number;
  visitada: boolean;
}

const CENTRO_DEFAULT: [number, number] = [18.4861, -69.9312]; // Santo Domingo, RD — zona de operación de Concaribe

export function MapaRutaVendedor({
  polyline,
  posicionActual,
  empresas,
}: {
  polyline: string | null;
  posicionActual: [number, number] | null;
  empresas: EmpresaEnMapa[];
}) {
  const path = polyline ? decodePolyline(polyline).map(([lat, lng]) => [lat, lng] as [number, number]) : [];
  const centro: [number, number] = posicionActual ?? path[0] ?? CENTRO_DEFAULT;

  return (
    <MapContainer center={centro} zoom={13} className="h-[45vh] w-full rounded-lg">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {path.length > 1 && <Polyline positions={path} pathOptions={{ color: "#1B3A6B", weight: 4 }} />}
      {empresas.map((e) => (
        <CircleMarker
          key={e.id}
          center={[e.lat, e.lng]}
          radius={8}
          pathOptions={{
            color: "#fff",
            weight: 2,
            fillColor: e.visitada ? "#A9C93B" : "#1B3A6B",
            fillOpacity: 1,
          }}
        >
          <Tooltip>{e.nombre}</Tooltip>
        </CircleMarker>
      ))}
      {posicionActual && (
        <CircleMarker
          center={posicionActual}
          radius={7}
          pathOptions={{ color: "#fff", weight: 2, fillColor: "#D97706", fillOpacity: 1 }}
        />
      )}
    </MapContainer>
  );
}
