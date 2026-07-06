"use client";
import { useEffect, useRef, useState } from "react";
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

function obtenerPosicion(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(err),
      { enableHighAccuracy: true }
    );
  });
}

export default function IniciarRutaPage() {
  const router = useRouter();
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [seleccionadas, setSeleccionadas] = useState<Set<string>>(new Set());
  const [orden, setOrden] = useState<string[] | null>(null);
  const [ordenSugeridoOriginal, setOrdenSugeridoOriginal] = useState<string[]>([]);
  const [calculando, setCalculando] = useState(false);
  const [iniciando, setIniciando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabaseBrowser.auth.getUser();
      const { data } = await supabaseBrowser
        .from("empresas")
        .select("id, nombre, direccion, lat, lng")
        .eq("vendedor_id", user!.id)
        .not("lat", "is", null)
        .order("nombre");

      setEmpresas(
        (data ?? []).map((e: any) => ({
          id: e.id,
          nombre: e.nombre,
          direccion: e.direccion,
          lat: e.lat,
          lng: e.lng,
        }))
      );
    })();
  }, []);

  const empresasPorId = new Map(empresas.map((e) => [e.id, e]));

  // Recalcula automáticamente el orden sugerido cuando cambia la selección (debounce
  // de 1s para no disparar un cálculo de ruta —facturable— por cada clic).
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (seleccionadas.size === 0) {
      setOrden(null);
      setError(null);
      return;
    }
    debounceRef.current = setTimeout(() => void calcularSugerencia(), 1000);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seleccionadas, empresas]);

  function toggleSeleccion(id: string) {
    setSeleccionadas((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function calcularSugerencia() {
    setCalculando(true);
    setError(null);
    try {
      const origen = await obtenerPosicion();
      const puntos = [...seleccionadas].map((id) => {
        const e = empresasPorId.get(id)!;
        return { empresaId: e.id, lat: e.lat, lng: e.lng };
      });

      const res = await fetch("/api/rutas/optimizar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ origen, puntos }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo calcular la ruta sugerida.");
        return;
      }
      setOrden(data.ordenSugerido);
      setOrdenSugeridoOriginal(data.ordenSugerido);
    } catch {
      setError("No se pudo obtener tu ubicación actual. Actívala e intenta de nuevo.");
    } finally {
      setCalculando(false);
    }
  }

  function mover(indice: number, direccion: -1 | 1) {
    if (!orden) return;
    const nuevo = [...orden];
    const destino = indice + direccion;
    [nuevo[indice], nuevo[destino]] = [nuevo[destino], nuevo[indice]];
    setOrden(nuevo);
  }

  async function iniciarRuta() {
    if (!orden) return;
    setIniciando(true);
    setError(null);

    try {
      const origen = await obtenerPosicion();
      const puntos = orden.map((id) => {
        const e = empresasPorId.get(id)!;
        return { empresaId: e.id, lat: e.lat, lng: e.lng };
      });

      const res = await fetch("/api/rutas/optimizar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ origen, puntos, ordenManual: orden }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo generar la ruta final.");
        setIniciando(false);
        return;
      }

      const {
        data: { user },
      } = await supabaseBrowser.auth.getUser();
      const hoy = new Date().toISOString().slice(0, 10);
      const ubicacionWkt = `SRID=4326;POINT(${origen.lng} ${origen.lat})`;

      // Check-in de jornada (si aún no se hizo hoy): iniciar la ruta es el momento del check-in.
      const { data: jornada } = await supabaseBrowser
        .from("jornadas")
        .select("id, check_in")
        .eq("vendedor_id", user!.id)
        .eq("fecha", hoy)
        .maybeSingle();

      if (!jornada) {
        await supabaseBrowser.from("jornadas").insert({
          vendedor_id: user!.id,
          fecha: hoy,
          check_in: new Date().toISOString(),
          check_in_ubicacion: ubicacionWkt,
        });
      } else if (!jornada.check_in) {
        await supabaseBrowser
          .from("jornadas")
          .update({ check_in: new Date().toISOString(), check_in_ubicacion: ubicacionWkt })
          .eq("id", jornada.id);
      }

      const { error: dbError } = await supabaseBrowser.from("rutas").upsert(
        {
          vendedor_id: user!.id,
          fecha: hoy,
          orden_sugerido: ordenSugeridoOriginal,
          orden_visitas: orden,
          polyline: data.polyline,
          estado: "en_curso",
        },
        { onConflict: "vendedor_id,fecha,turno" }
      );

      if (dbError) {
        setError(dbError.message);
        setIniciando(false);
        return;
      }
      router.push("/ruta/activa");
    } catch {
      setError("No se pudo obtener tu ubicación actual.");
      setIniciando(false);
    }
  }

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold text-marca-azul">Iniciar ruta</h1>
      <p className="mb-3 text-sm text-slate-500">
        Selecciona las empresas que visitarás hoy. El orden óptimo se calcula solo.
      </p>

      <SeleccionEmpresasRuta empresas={empresas} seleccionadas={seleccionadas} onToggle={toggleSeleccion} />

      {calculando && <p className="mt-3 text-sm text-slate-500">Calculando orden óptimo...</p>}
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {orden && !calculando && (
        <div className="mt-4">
          <p className="mb-2 text-sm font-medium text-slate-700">
            Orden sugerido (puedes reordenar con las flechas):
          </p>
          <OrdenSugeridoVsManual orden={orden} empresasPorId={empresasPorId} onMover={mover} />
          <button
            onClick={iniciarRuta}
            disabled={iniciando}
            className="mt-4 w-full rounded-md bg-marca-lima-oscuro px-4 py-3 font-medium text-white disabled:opacity-60"
          >
            {iniciando ? "Iniciando..." : "Iniciar ruta (check-in de jornada)"}
          </button>
        </div>
      )}
    </div>
  );
}
