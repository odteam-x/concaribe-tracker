"use client";
import dynamic from "next/dynamic";

// Leaflet accede a `window` al importarse, así que se carga solo en el cliente
// (ssr: false) para evitar que reviente durante el render en el servidor.
const MapaVivoOficina = dynamic(
  () => import("@/components/mapa/MapaVivoOficina").then((m) => m.MapaVivoOficina),
  { ssr: false, loading: () => <div className="p-6 text-slate-500">Cargando mapa...</div> }
);

export default function MapaVivoPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-marca-azul">Mapa en vivo</h1>
      <MapaVivoOficina />
    </div>
  );
}
