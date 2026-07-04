"use client";
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { ResultadoBusqueda } from "@/app/api/geocode/buscar/route";

const PickerMapaInterno = dynamic(() => import("./PickerMapaInterno").then((m) => m.PickerMapaInterno), {
  ssr: false,
  loading: () => <div className="flex h-56 w-full items-center justify-center rounded-md bg-slate-100 text-sm text-slate-400">Cargando mapa...</div>,
});

interface UbicacionConfirmada {
  direccion: string;
  lat: number;
  lng: number;
}

/**
 * Buscador de direcciones/negocios con confirmación visual en mapa: el vendedor
 * escribe el nombre del local o la dirección, elige entre los resultados, y puede
 * arrastrar el pin para afinar la ubicación exacta antes de guardar.
 */
export function BuscadorDireccionMapa({
  valorInicial,
  onConfirmar,
}: {
  valorInicial?: string;
  onConfirmar: (ubicacion: UbicacionConfirmada) => void;
}) {
  const [query, setQuery] = useState(valorInicial ?? "");
  const [resultados, setResultados] = useState<ResultadoBusqueda[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [seleccionado, setSeleccionado] = useState<UbicacionConfirmada | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (seleccionado || query.trim().length < 3) {
      setResultados([]);
      return;
    }

    // Debounce de 800ms: respeta el límite de 1 request/segundo de Nominatim y evita
    // buscar en cada tecla (política de uso de Nominatim desaconseja autocompletado agresivo).
    debounceRef.current = setTimeout(async () => {
      setBuscando(true);
      const res = await fetch(`/api/geocode/buscar?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setBuscando(false);
      setResultados(data.resultados ?? []);
    }, 800);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, seleccionado]);

  function elegirResultado(r: ResultadoBusqueda) {
    setSeleccionado(r);
    setQuery(r.direccion);
    setResultados([]);
    onConfirmar(r);
  }

  function moverPin(lat: number, lng: number) {
    if (!seleccionado) return;
    const actualizado = { ...seleccionado, lat, lng };
    setSeleccionado(actualizado);
    onConfirmar(actualizado);
  }

  return (
    <div>
      <label className="block text-sm font-medium text-slate-700">Nombre del local o dirección</label>
      <div className="relative">
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSeleccionado(null);
          }}
          placeholder="Ej. Colmado La Esquina, Calle Duarte 45..."
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 focus:border-marca-azul focus:outline-none"
        />
        {buscando && <p className="mt-1 text-xs text-slate-400">Buscando...</p>}
        {resultados.length > 0 && (
          <ul className="absolute z-10 mt-1 w-full rounded-md border border-slate-200 bg-white shadow-lg">
            {resultados.map((r, i) => (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => elegirResultado(r)}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                >
                  {r.direccion}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {seleccionado && (
        <div className="mt-2">
          <PickerMapaInterno lat={seleccionado.lat} lng={seleccionado.lng} onMover={moverPin} />
          <p className="mt-1 text-xs text-slate-500">
            Arrastra el pin si la ubicación no cayó exacta sobre el local.
          </p>
        </div>
      )}
    </div>
  );
}
