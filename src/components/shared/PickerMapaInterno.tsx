"use client";
import { GoogleMap, MarkerF } from "@react-google-maps/api";
import { useGoogleMaps } from "@/components/mapa/GoogleMapProvider";

export function PickerMapaInterno({
  lat,
  lng,
  onMover,
}: {
  lat: number;
  lng: number;
  onMover: (lat: number, lng: number) => void;
}) {
  const { isLoaded } = useGoogleMaps();

  if (!isLoaded) {
    return <div className="flex h-64 w-full items-center justify-center rounded-md bg-slate-100 text-sm text-slate-400">Cargando mapa...</div>;
  }

  return (
    <GoogleMap
      mapContainerClassName="h-64 w-full rounded-md"
      center={{ lat, lng }}
      zoom={17}
      onClick={(e) => {
        if (e.latLng) onMover(e.latLng.lat(), e.latLng.lng());
      }}
    >
      <MarkerF
        position={{ lat, lng }}
        draggable
        onDragEnd={(e) => {
          if (e.latLng) onMover(e.latLng.lat(), e.latLng.lng());
        }}
      />
    </GoogleMap>
  );
}
