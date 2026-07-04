"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { SeleccionEmpresasRuta } from "@/components/vendedor/SeleccionEmpresasRuta";
import { OrdenSugeridoVsManual } from "@/components/vendedor/OrdenSugeridoVsManual";

interface Empresa {
  id: string;
  nombre: string;
  direccion: string | null;
  lat: number;
  lng: number;
}

function parsePunto(valor: string): [number, number] {
  const match = /POINT\(([-\d.]+) ([-\d.]+)\)/.exec(valor);
  if (!match) return [0, 0];
  return [parseFloat(match[1]), parseFloat(match[2])];
}

export default function IniciarRutaPage() {
  const router = useRouter();
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [seleccionadas, setSeleccionadas] = useState<Set<string>>(new Set());
  const [orden, setOrden] = useState<string[] | null>(null);
  const [ordenSugeridoOriginal, setOrdenSugeridoOriginal] = useState<string[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabaseBrowser.auth.getUser();
      const { data } = await supabaseBrowser
        .from("empresas")
        .select("id, nombre, direccion, ubicacion")
        .eq("vendedor_id", user!.id)
        .order("nombre");

      setEmpresas(
        (data ?? []).map((e: any) => {
          const [lng, lat] = parsePunto(e.ubicacion);
          return { id: e.id, nombre: e.nombre, direccion: e.direccion, lat, lng };
        })
      );
    })();
  }, []);

  const empresasPorId = new Map(empresas.map((e) => [e.id, e]));

  function toggleSeleccion(id: string) {
    setSeleccionadas((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function calcularSugerencia() {
    if (seleccionadas.size === 0) {
      setError("Selecciona al menos una empresa.");
      return;
    }
    setCargando(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const origen = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        const puntos = [...seleccionadas].map((id) => {
          const e = empresasPorId.get(id)!;
          return { empresaId: e.id, lat: e.lat, lng: e.lng };
        });

        const res = await fetch("/api/rutas/optimizar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ origen, puntos }),
        });

        setCargando(false);
        if (!res.ok) {
          setError("No se pudo calcular la ruta sugerida.");
          return;
        }
        const { ordenSugerido } = await res.json();
        setOrden(ordenSugerido);
        setOrdenSugeridoOriginal(ordenSugerido);
      },
      () => {
        setCargando(false);
        setError("No se pudo obtener tu ubicación actual. Actívala e intenta de nuevo.");
      },
      { enableHighAccuracy: true }
    );
  }

  function mover(indice: number, direccion: -1 | 1) {
    if (!orden) return;
    const nuevo = [...orden];
    const destino = indice + direccion;
    [nuevo[indice], nuevo[destino]] = [nuevo[destino], nuevo[indice]];
    setOrden(nuevo);
  }

  async function confirmarRuta() {
    if (!orden) return;
    setCargando(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const origen = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        const puntos = orden.map((id) => {
          const e = empresasPorId.get(id)!;
          return { empresaId: e.id, lat: e.lat, lng: e.lng };
        });

        const res = await fetch("/api/rutas/optimizar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ origen, puntos, ordenManual: orden }),
        });

        if (!res.ok) {
          setCargando(false);
          setError("No se pudo generar el polyline final.");
          return;
        }
        const { polyline } = await res.json();

        const {
          data: { user },
        } = await supabaseBrowser.auth.getUser();
        const hoy = new Date().toISOString().slice(0, 10);

        const { data: ruta, error: dbError } = await supabaseBrowser
          .from("rutas")
          .upsert(
            {
              vendedor_id: user!.id,
              fecha: hoy,
              orden_sugerido: ordenSugeridoOriginal,
              orden_visitas: orden,
              polyline,
              estado: "en_curso",
            },
            { onConflict: "vendedor_id,fecha,turno" }
          )
          .select("id")
          .single();

        setCargando(false);
        if (dbError || !ruta) {
          setError(dbError?.message ?? "No se pudo guardar la ruta.");
          return;
        }
        router.push("/ruta/activa");
      },
      () => {
        setCargando(false);
        setError("No se pudo obtener tu ubicación actual.");
      },
      { enableHighAccuracy: true }
    );
  }

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold text-marca-azul">Iniciar ruta</h1>

      {!orden ? (
        <>
          <p className="mb-3 text-sm text-slate-500">Selecciona las empresas que visitarás hoy.</p>
          <SeleccionEmpresasRuta empresas={empresas} seleccionadas={seleccionadas} onToggle={toggleSeleccion} />
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          <button
            onClick={calcularSugerencia}
            disabled={cargando}
            className="mt-4 w-full rounded-md bg-marca-azul px-4 py-3 font-medium text-white disabled:opacity-60"
          >
            {cargando ? "Calculando..." : "Calcular orden sugerido"}
          </button>
        </>
      ) : (
        <>
          <p className="mb-3 text-sm text-slate-500">
            Orden sugerido por el sistema. Puedes reordenar manualmente antes de confirmar.
          </p>
          <OrdenSugeridoVsManual orden={orden} empresasPorId={empresasPorId} onMover={mover} />
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          <div className="mt-4 flex gap-3">
            <button
              onClick={() => setOrden(null)}
              className="flex-1 rounded-md border border-slate-300 px-4 py-3 font-medium text-slate-600"
            >
              Volver
            </button>
            <button
              onClick={confirmarRuta}
              disabled={cargando}
              className="flex-1 rounded-md bg-marca-lima-oscuro px-4 py-3 font-medium text-white disabled:opacity-60"
            >
              {cargando ? "Iniciando..." : "Confirmar e iniciar"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
