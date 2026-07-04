"use client";
import { useMemo, useRef } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import type { Marker as LeafletMarker } from "leaflet";
import "leaflet/dist/leaflet.css";

function ClicksDelMapa({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

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
    <MapContainer center={[lat, lng]} zoom={16} className="h-64 w-full rounded-md">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ClicksDelMapa onClick={onMover} />
      <Marker position={[lat, lng]} draggable eventHandlers={eventHandlers} ref={markerRef} />
    </MapContainer>
  );
}
