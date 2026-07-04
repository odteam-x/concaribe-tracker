"use client";
import { useJsApiLoader } from "@react-google-maps/api";

const LIBRARIES: ("places" | "visualization")[] = ["places", "visualization"];

/** Carga la Maps JavaScript API una sola vez (key pública restringida por HTTP referrer). */
export function useGoogleMaps() {
  return useJsApiLoader({
    id: "concaribe-google-maps",
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
    libraries: LIBRARIES,
  });
}
