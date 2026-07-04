"use client";
import { useMemo, useRef } from "react";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import type { Marker as LeafletMarker } from "leaflet";
import "leaflet/dist/leaflet.css";

export function PickerMapaInterno({
  lat,
  lng,
  onMover,
}: {
  lat: number;
  lng: number;
  onMover: (lat: number, lng: number) => void;
}) {
  const markerRef = useRef<LeafletMarker | null>(null);

  const eventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;
        if (!marker) return;
        const pos = marker.getLatLng();
        onMover(pos.lat, pos.lng);
      },
    }),
    [onMover]
  );

  return (
    <MapContainer center={[lat, lng]} zoom={17} className="h-56 w-full rounded-md">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={[lat, lng]} draggable eventHandlers={eventHandlers} ref={markerRef} />
    </MapContainer>
  );
}
