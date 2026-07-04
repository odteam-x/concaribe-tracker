"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { v4 as uuidv4 } from "uuid";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useJornadaActiva } from "@/hooks/useJornadaActiva";
import { useGeolocationTracking } from "@/hooks/useGeolocationTracking";
import { queueDesvio, completarMotivoDesvioLocal } from "@/lib/offline/queueRepository";
import { ProgresoVisitasCounter } from "@/components/vendedor/ProgresoVisitasCounter";
import { DesvioToast } from "@/components/vendedor/DesvioToast";
import { LlegadaAutoBanner } from "@/components/vendedor/LlegadaAutoBanner";

const MapaRutaVendedor = dynamic(() => import("@/components/mapa/MapaRutaVendedor").then((m) => m.MapaRutaVendedor), {
  ssr: false,
  loading: () => <div className="p-6 text-slate-500">Cargando mapa...</div>,
});

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

function parsePunto(valor: string): [number, number] {
  const match = /POINT\(([-\d.]+) ([-\d.]+)\)/.exec(valor);
  if (!match) return [0, 0];
  return [parseFloat(match[1]), parseFloat(match[2])];
}

export default function RutaActivaPage() {
  const [vendedorId, setVendedorId] = useState<string | null>(null);
  const [ruta, setRuta] = useState<Ruta | null>(null);
  const [empresas, setEmpresas] = useState<EmpresaRuta[]>([]);
  const [visitadas, setVisitadas] = useState<Set<string>>(new Set());
  const [posicionActual, setPosicionActual] = useState<[number, number] | null>(null);
  const [desvioPendiente, setDesvioPendiente] = useState<{ clientUuid: string; distanciaMetros: number } | null>(null);
  const [llegada, setLlegada] = useState<{ empresaId: string; nombre: string } | null>(null);

  const { jornada } = useJornadaActiva(vendedorId);

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
        .maybeSingle();
      if (!rutaHoy) return;
      setRuta(rutaHoy);

      const { data: empresasData } = await supabaseBrowser
        .from("empresas")
        .select("id, nombre, ubicacion")
        .in("id", rutaHoy.orden_visitas);
      setEmpresas(
        (empresasData ?? []).map((e: any) => {
          const [lng, lat] = parsePunto(e.ubicacion);
          return { id: e.id, nombre: e.nombre, lat, lng };
        })
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

  if (!ruta) {
    return (
      <div className="py-10 text-center text-slate-500">
        No tienes una ruta iniciada hoy.{" "}
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

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-marca-azul">Ruta en curso</h1>

      <ProgresoVisitasCounter planificados={planificados} visitados={visitadosPlanificados} agregados={agregados} />

      <MapaRutaVendedor
        polyline={ruta.polyline}
        posicionActual={posicionActual}
        empresas={empresas.map((e) => ({ ...e, visitada: visitadas.has(e.id) }))}
      />

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
        <h2 className="mb-2 text-sm font-medium text-slate-600">Empresas de hoy</h2>
        <div className="space-y-2">
          {empresas.map((e) => (
            <Link
              key={e.id}
              href={`/visita/${e.id}`}
              className={`flex items-center justify-between rounded-lg border p-3 ${
                visitadas.has(e.id) ? "border-marca-lima/40 bg-marca-lima/5" : "border-slate-200 bg-white"
              }`}
            >
              <span>{e.nombre}</span>
              <span className="text-xs text-slate-500">{visitadas.has(e.id) ? "Visitada" : "Pendiente"}</span>
            </Link>
          ))}
        </div>
      </div>

      <Link href="/mis-empresas" className="block rounded-md border border-marca-azul px-4 py-3 text-center text-sm font-medium text-marca-azul">
        + Visitar otra empresa (agregada fuera de plan)
      </Link>
    </div>
  );
}
