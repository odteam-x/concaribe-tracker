"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useJornadaActiva } from "@/hooks/useJornadaActiva";
import { useGeolocationTracking } from "@/hooks/useGeolocationTracking";
import { useWakeLock } from "@/hooks/useWakeLock";
import { queueDesvio, completarMotivoDesvioLocal } from "@/lib/offline/queueRepository";
import { ProgresoVisitasCounter } from "@/components/vendedor/ProgresoVisitasCounter";
import { DesvioToast } from "@/components/vendedor/DesvioToast";
import { LlegadaAutoBanner } from "@/components/vendedor/LlegadaAutoBanner";
import { MapaRutaVendedor } from "@/components/mapa/MapaRutaVendedor";

interface Ruta {
  id: string;
  polyline: string | null;
  orden_visitas: string[];
}
interface EmpresaRuta {
  id: string;
  nombre: string;
  lat: number;
  lng: number;
}

export default function RutaActivaPage() {
  const router = useRouter();
  const [vendedorId, setVendedorId] = useState<string | null>(null);
  const [ruta, setRuta] = useState<Ruta | null>(null);
  const [cargando, setCargando] = useState(true);
  const [empresas, setEmpresas] = useState<EmpresaRuta[]>([]);
  const [visitadas, setVisitadas] = useState<Set<string>>(new Set());
  const [posicionActual, setPosicionActual] = useState<[number, number] | null>(null);
  const [desvioPendiente, setDesvioPendiente] = useState<{ clientUuid: string; distanciaMetros: number } | null>(null);
  const [llegada, setLlegada] = useState<{ empresaId: string; nombre: string } | null>(null);
  const [terminando, setTerminando] = useState(false);

  const { jornada } = useJornadaActiva(vendedorId);
  useWakeLock(!!jornada?.id);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabaseBrowser.auth.getUser();
      setVendedorId(user!.id);

      const hoy = new Date().toISOString().slice(0, 10);
      const { data: rutaHoy } = await supabaseBrowser
        .from("rutas")
        .select("id, polyline, orden_visitas")
        .eq("vendedor_id", user!.id)
        .eq("fecha", hoy)
        .eq("estado", "en_curso")
        .maybeSingle();
      setCargando(false);
      if (!rutaHoy) return;
      setRuta(rutaHoy);

      const { data: empresasData } = await supabaseBrowser
        .from("empresas")
        .select("id, nombre, lat, lng")
        .in("id", rutaHoy.orden_visitas);
      setEmpresas(
        (empresasData ?? []).map((e: any) => ({ id: e.id, nombre: e.nombre, lat: e.lat, lng: e.lng }))
      );

      const { data: visitas } = await supabaseBrowser.from("visitas").select("empresa_id").eq("ruta_id", rutaHoy.id);
      setVisitadas(new Set((visitas ?? []).map((v) => v.empresa_id)));
    })();
  }, []);

  useGeolocationTracking({
    vendedorId: vendedorId ?? "",
    jornadaId: jornada?.id ?? null,
    polylinePlanificada: ruta?.polyline ?? null,
    empresasPendientes: empresas.map((e) => ({ ...e, yaVisitado: visitadas.has(e.id) })),
    onDesvioDetectado: (distanciaMetros, ubicacion) => {
      setPosicionActual(ubicacion);
      if (desvioPendiente) return; // ya hay un toast abierto, no duplicar
      const clientUuid = uuidv4();
      setDesvioPendiente({ clientUuid, distanciaMetros });
      if (ruta && vendedorId) {
        void queueDesvio({
          clientUuid,
          vendedorId,
          rutaId: ruta.id,
          lat: ubicacion[0],
          lng: ubicacion[1],
          distanciaMetros,
          timestampDispositivo: new Date().toISOString(),
          motivo: null,
          sincronizado: false,
        });
      }
    },
    onLlegadaDetectada: (empresaId, nombre) => {
      if (!visitadas.has(empresaId)) setLlegada({ empresaId, nombre });
    },
  });

  // Posición en vivo para el mapa (independiente del tick de tracking de 60s)
  useEffect(() => {
    if (!ruta || !("geolocation" in navigator)) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => setPosicionActual([pos.coords.latitude, pos.coords.longitude]),
      () => {},
      { enableHighAccuracy: true }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [ruta]);

  async function terminarRuta(estado: "finalizada" | "cancelada") {
    if (!ruta || !vendedorId) return;
    const etiqueta = estado === "cancelada" ? "cancelar la ruta" : "finalizar la ruta";
    if (!confirm(`¿Seguro que quieres ${etiqueta}? Esto también cierra tu jornada.`)) return;

    setTerminando(true);
    await supabaseBrowser.from("rutas").update({ estado }).eq("id", ruta.id);

    // Cierra la jornada (check-out) con la última posición conocida
    if (jornada?.id) {
      const checkOut: Record<string, unknown> = { check_out: new Date().toISOString() };
      if (posicionActual) {
        checkOut.check_out_ubicacion = `SRID=4326;POINT(${posicionActual[1]} ${posicionActual[0]})`;
      }
      await supabaseBrowser.from("jornadas").update(checkOut).eq("id", jornada.id);
    }
    setTerminando(false);
    router.push("/inicio");
    router.refresh();
  }

  if (cargando) return <p className="py-10 text-center text-slate-500">Cargando...</p>;

  if (!ruta) {
    return (
      <div className="py-10 text-center text-slate-500">
        No tienes una ruta en curso.{" "}
        <Link href="/ruta/iniciar" className="text-marca-azul underline">
          Inicia una
        </Link>
        .
      </div>
    );
  }

  const planificados = ruta.orden_visitas.length;
  const visitadosPlanificados = ruta.orden_visitas.filter((id) => visitadas.has(id)).length;
  const agregados = [...visitadas].filter((id) => !ruta.orden_visitas.includes(id)).length;

  // Siguiente parada pendiente según el orden confirmado
  const siguienteId = ruta.orden_visitas.find((id) => !visitadas.has(id));
  const siguiente = siguienteId ? empresas.find((e) => e.id === siguienteId) : undefined;

  // Paradas pendientes en orden, para navegar la ruta completa de una sola vez.
  const pendientes = ruta.orden_visitas
    .filter((id) => !visitadas.has(id))
    .map((id) => empresas.find((e) => e.id === id))
    .filter((e): e is EmpresaRuta => !!e);

  // URL de Google Maps que encadena TODAS las paradas pendientes: origen = posición
  // actual, waypoints = paradas intermedias, destino = última parada. Así el vendedor
  // obtiene navegación giro a giro que lo lleva por todo el recorrido, no un solo punto.
  function urlNavegarRutaCompleta(): string {
    if (pendientes.length === 0) return "#";
    const destino = pendientes[pendientes.length - 1];
    const intermedias = pendientes.slice(0, -1);
    const params = new URLSearchParams({ api: "1", travelmode: "driving" });
    if (posicionActual) params.set("origin", `${posicionActual[0]},${posicionActual[1]}`);
    params.set("destination", `${destino.lat},${destino.lng}`);
    if (intermedias.length > 0) {
      params.set("waypoints", intermedias.map((e) => `${e.lat},${e.lng}`).join("|"));
    }
    return `https://www.google.com/maps/dir/?${params.toString()}`;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-marca-azul">Ruta en curso</h1>

      <ProgresoVisitasCounter planificados={planificados} visitados={visitadosPlanificados} agregados={agregados} />

      <MapaRutaVendedor
        polyline={ruta.polyline}
        posicionActual={posicionActual}
        empresas={empresas.map((e) => ({ ...e, visitada: visitadas.has(e.id) }))}
        siguienteId={siguiente?.id ?? null}
        modoSeguimiento
      />

      {pendientes.length > 0 && (
        <div className="space-y-2 rounded-lg border border-marca-azul/30 bg-marca-azul/5 p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500">Siguiente parada</p>
              <p className="font-medium text-marca-azul">{siguiente?.nombre}</p>
            </div>
            {siguiente && (
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${siguiente.lat},${siguiente.lng}&travelmode=driving`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md border border-marca-azul px-3 py-2 text-sm font-medium text-marca-azul"
              >
                Solo esta ➤
              </a>
            )}
          </div>
          {/* Navegación giro a giro (app de Google Maps) que encadena TODAS las paradas
              pendientes en orden. El tracking de nuestra app sigue corriendo en segundo plano. */}
          <a
            href={urlNavegarRutaCompleta()}
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-md bg-marca-azul px-4 py-2 text-center text-sm font-medium text-white"
          >
            Navegar ruta completa ({pendientes.length} {pendientes.length === 1 ? "parada" : "paradas"}) ➤
          </a>
        </div>
      )}

      {desvioPendiente && (
        <DesvioToast
          desvio={desvioPendiente}
          onCompletarMotivo={async (motivo) => {
            await completarMotivoDesvioLocal(desvioPendiente.clientUuid, motivo);
            setDesvioPendiente(null);
          }}
          onDescartar={() => setDesvioPendiente(null)}
        />
      )}

      {llegada && (
        <LlegadaAutoBanner empresaId={llegada.empresaId} nombre={llegada.nombre} onDeshacer={() => setLlegada(null)} />
      )}

      <div>
        <h2 className="mb-2 text-sm font-medium text-slate-600">Clientes de hoy</h2>
        <div className="space-y-2">
          {ruta.orden_visitas.map((id, i) => {
            const e = empresas.find((x) => x.id === id);
            if (!e) return null;
            return (
              <div
                key={e.id}
                className={`flex items-center justify-between rounded-lg border p-3 ${
                  visitadas.has(e.id) ? "border-marca-lima/40 bg-marca-lima/5" : "border-slate-200 bg-white"
                }`}
              >
                <Link href={`/visita/${e.id}`} className="flex-1">
                  <span className="mr-2 font-medium text-marca-azul">{i + 1}.</span>
                  {e.nombre}
                </Link>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-500">{visitadas.has(e.id) ? "Visitada" : "Pendiente"}</span>
                  {!visitadas.has(e.id) && (
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${e.lat},${e.lng}&travelmode=driving`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-medium text-marca-azul underline"
                    >
                      Navegar
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Link href="/mis-empresas" className="block rounded-md border border-marca-azul px-4 py-3 text-center text-sm font-medium text-marca-azul">
        + Visitar otro cliente (fuera de plan)
      </Link>

      <div className="flex gap-3">
        <button
          onClick={() => terminarRuta("cancelada")}
          disabled={terminando}
          className="flex-1 rounded-md border border-red-300 px-4 py-3 text-sm font-medium text-red-600 disabled:opacity-60"
        >
          Cancelar ruta
        </button>
        <button
          onClick={() => terminarRuta("finalizada")}
          disabled={terminando}
          className="flex-1 rounded-md bg-marca-lima-oscuro px-4 py-3 text-sm font-medium text-white disabled:opacity-60"
        >
          Finalizar ruta
        </button>
      </div>
    </div>
  );
}
