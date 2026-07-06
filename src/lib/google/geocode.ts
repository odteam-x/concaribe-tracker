// Server-side only: usa GOOGLE_MAPS_SERVER_API_KEY (key privada, sin restricción
// de HTTP referrer). Se expone al cliente vía Route Handlers, nunca se importa
// directamente desde un componente "use client".
export interface ResultadoGeocode {
  direccionFormateada: string;
  lat: number;
  lng: number;
}

export async function geocodificarDireccion(direccion: string): Promise<ResultadoGeocode | null> {
  const params = new URLSearchParams({
    address: direccion,
    key: process.env.GOOGLE_MAPS_SERVER_API_KEY!,
  });

  const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?${params}`);
  const data = await res.json();

  if (data.status !== "OK" || !data.results?.length) return null;

  const resultado = data.results[0];
  return {
    direccionFormateada: resultado.formatted_address,
    lat: resultado.geometry.location.lat,
    lng: resultado.geometry.location.lng,
  };
}

/** Geocodificación inversa (lat/lng -> dirección legible), usada cuando el usuario coloca el pin a mano. */
export async function geocodificarInverso(lat: number, lng: number): Promise<string | null> {
  const params = new URLSearchParams({
    latlng: `${lat},${lng}`,
    key: process.env.GOOGLE_MAPS_SERVER_API_KEY!,
  });

  const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?${params}`);
  const data = await res.json();

  if (data.status !== "OK" || !data.results?.length) return null;
  return data.results[0].formatted_address as string;
}
