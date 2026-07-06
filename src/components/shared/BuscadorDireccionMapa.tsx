"use client";
import { useEffect, useRef, useState } from "react";
import type { ResultadoBusqueda } from "@/app/api/geocode/buscar/route";
import { useUbicacionNavegador } from "@/hooks/useUbicacionNavegador";
import { PickerMapaInterno } from "./PickerMapaInterno";

const SANTO_DOMINGO: [number, number] = [18.4861, -69.9312];

interface UbicacionConfirmada {
  direccion: string;
  lat: number;
  lng: number;
}

/**
 * Buscador de direcciones/negocios (Places API — sí tiene la mayoría de negocios
 * pequeños registrados) con mapa SIEMPRE visible: el vendedor puede escribir el
 * nombre del local y elegir un resultado, O simplemente hacer clic / arrastrar el
 * pin a mano en el mapa si ese local en particular no aparece en la búsqueda.
 */
export function BuscadorDireccionMapa({
  valorInicial,
  latInicial,
  lngInicial,
  onConfirmar,
}: {
  valorInicial?: string;
  latInicial?: number;
  lngInicial?: number;
  onConfirmar: (ubicacion: UbicacionConfirmada) => void;
}) {
  const { posicion: miPosicion } = useUbicacionNavegador({ activo: false });
  const [query, setQuery] = useState(valorInicial ?? "");
  const [resultados, setResultados] = useState<ResultadoBusqueda[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [sinResultados, setSinResultados] = useState(false);
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(
    latInicial != null && lngInicial != null ? { lat: latInicial, lng: lngInicial } : null
  );
  const [direccion, setDireccion] = useState(valorInicial ?? "");
  const [buscandoDireccion, setBuscandoDireccion] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seleccionandoRef = useRef(false);

  // Si no hay ubicación inicial (empresa nueva), centra el mapa en la posición actual
  // del vendedor apenas esté disponible, para que el pin arranque cerca de donde está.
  useEffect(() => {
    if (pin === null && miPosicion) setPin(miPosicion);
  }, [miPosicion, pin]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (seleccionandoRef.current) {
      seleccionandoRef.current = false;
      return;
    }
    if (query.trim().length < 3) {
      setResultados([]);
      setSinResultados(false);
      return;
    }

    // Debounce de 500ms: evita disparar una búsqueda (facturable) por cada tecla.
    debounceRef.current = setTimeout(async () => {
      setBuscando(true);
      const res = await fetch(`/api/geocode/buscar?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setBuscando(false);
      setResultados(data.resultados ?? []);
      setSinResultados((data.resultados ?? []).length === 0);
    }, 500);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  function elegirResultado(r: ResultadoBusqueda) {
    seleccionandoRef.current = true;
    setQuery(r.direccion);
    setDireccion(r.direccion);
    setPin({ lat: r.lat, lng: r.lng });
    setResultados([]);
    setSinResultados(false);
    onConfirmar(r);
  }

  async function moverPin(lat: number, lng: number) {
    setPin({ lat, lng });
    setBuscandoDireccion(true);
    const res = await fetch(`/api/geocode/inverso?lat=${lat}&lng=${lng}`);
    const data = await res.json();
    setBuscandoDireccion(false);
    const direccionEncontrada = data.direccion ?? direccion;
    setDireccion(direccionEncontrada);
    onConfirmar({ direccion: direccionEncontrada, lat, lng });
  }

  const centro: [number, number] = pin ? [pin.lat, pin.lng] : SANTO_DOMINGO;

  return (
    <div>
      <label className="block text-sm font-medium text-slate-700">Nombre del local o dirección</label>
      <div className="relative">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ej. Colmado La Esquina, Calle Duarte 45..."
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 focus:border-marca-azul focus:outline-none"
        />
        {buscando && <p className="mt-1 text-xs text-slate-400">Buscando...</p>}
        {sinResultados && !buscando && (
          <p className="mt-1 text-xs text-amber-600">
            No encontramos ese nombre. Ubica el local directamente haciendo clic o arrastrando el pin abajo.
          </p>
        )}
        {resultados.length > 0 && (
          <ul className="absolute z-10 mt-1 w-full rounded-md border border-slate-200 bg-white shadow-lg">
            {resultados.map((r, i) => (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => elegirResultado(r)}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                >
                  {r.nombre && <span className="block font-medium text-slate-800">{r.nombre}</span>}
                  <span className="block text-slate-500">{r.direccion}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-2">
        <PickerMapaInterno lat={centro[0]} lng={centro[1]} onMover={moverPin} />
        <p className="mt-1 text-xs text-slate-500">
          {buscandoDireccion
            ? "Buscando la dirección de ese punto..."
            : "Haz clic en el mapa o arrastra el pin para ubicar el local exacto."}
        </p>
        {direccion && !buscandoDireccion && <p className="mt-1 text-xs text-slate-600">📍 {direccion}</p>}
      </div>
    </div>
  );
}
