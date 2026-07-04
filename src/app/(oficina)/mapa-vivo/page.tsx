import { MapaVivoOficina } from "@/components/mapa/MapaVivoOficina";

export default function MapaVivoPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-marca-azul">Mapa en vivo</h1>
      <MapaVivoOficina />
    </div>
  );
}
