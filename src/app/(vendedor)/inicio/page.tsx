import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const ETIQUETA_RESULTADO: Record<string, string> = {
  visitado: "Visitado",
  cotizado: "Cotizado",
  interesado: "Interesado",
  no_interesado: "No interesado",
  seguimiento: "Seguimiento",
  cerrado: "Cerrado",
  otro: "Otro",
};

export default async function InicioPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const vendedorId = session!.user.id;
  const hoy = new Date().toISOString().slice(0, 10);

  const [{ data: usuario }, { data: ruta }, { data: jornada }, { data: visitasHoy }, { count: totalEmpresas }] =
    await Promise.all([
      supabase.from("usuarios").select("nombre").eq("id", vendedorId).single(),
      supabase.from("rutas").select("id, estado, orden_visitas").eq("vendedor_id", vendedorId).eq("fecha", hoy).eq("estado", "en_curso").maybeSingle(),
      supabase.from("jornadas").select("check_in, check_out").eq("vendedor_id", vendedorId).eq("fecha", hoy).maybeSingle(),
      supabase
        .from("visitas")
        .select("resultado, comentario, timestamp_dispositivo, empresas(nombre)")
        .eq("vendedor_id", vendedorId)
        .gte("timestamp_dispositivo", `${hoy}T00:00:00`)
        .lte("timestamp_dispositivo", `${hoy}T23:59:59`)
        .order("timestamp_dispositivo", { ascending: false }),
      supabase.from("empresas").select("id", { count: "exact", head: true }).eq("vendedor_id", vendedorId),
    ]);

  const visitas = visitasHoy ?? [];
  const cerradasHoy = visitas.filter((v) => v.resultado === "cerrado").length;
  const cotizadasHoy = visitas.filter((v) => v.resultado === "cotizado").length;
  const rutaEnCurso = ruta?.estado === "en_curso";
  const jornadaCerrada = !!jornada?.check_out;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-marca-azul">Hola, {usuario?.nombre}</h1>
        <p className="text-sm capitalize text-slate-500">
          {new Date().toLocaleDateString("es-DO", { weekday: "long", day: "numeric", month: "long" })}
        </p>
      </div>

      {/* Estado de la jornada */}
      {jornadaCerrada ? (
        <div className="rounded-lg border border-marca-lima/40 bg-marca-lima/10 p-3 text-sm text-marca-lima-oscuro">
          ✓ Jornada finalizada por hoy. Abajo está tu reporte del día.
        </div>
      ) : rutaEnCurso ? (
        <div className="rounded-lg border border-marca-azul/30 bg-marca-azul/5 p-3 text-sm text-marca-azul">
          Tienes una ruta en curso.
        </div>
      ) : null}

      {/* Reporte del día */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-slate-200 bg-white p-3 text-center">
          <p className="text-2xl font-semibold text-marca-azul">{visitas.length}</p>
          <p className="text-xs text-slate-500">Visitas hoy</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-3 text-center">
          <p className="text-2xl font-semibold text-marca-lima-oscuro">{cerradasHoy}</p>
          <p className="text-xs text-slate-500">Cierres</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-3 text-center">
          <p className="text-2xl font-semibold text-marca-azul">{cotizadasHoy}</p>
          <p className="text-xs text-slate-500">Cotizados</p>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {rutaEnCurso ? (
          <Link href="/ruta/activa" className="rounded-md bg-marca-azul px-4 py-3 text-center font-medium text-white">
            Continuar ruta de hoy
          </Link>
        ) : (
          <Link href="/ruta/iniciar" className="rounded-md bg-marca-azul px-4 py-3 text-center font-medium text-white">
            {jornadaCerrada ? "Iniciar nueva ruta" : "Iniciar ruta de hoy"}
          </Link>
        )}
        <Link href="/mis-empresas" className="rounded-md border border-marca-azul px-4 py-3 text-center font-medium text-marca-azul">
          Ver mis clientes ({totalEmpresas ?? 0})
        </Link>
      </div>

      {/* Detalle de visitas de hoy (el "reporte") */}
      <div>
        <h2 className="mb-2 text-sm font-medium text-slate-600">Reporte de visitas de hoy</h2>
        <div className="space-y-2">
          {visitas.map((v: any, i: number) => (
            <div key={i} className="rounded-lg border border-slate-200 bg-white p-3">
              <div className="flex items-center justify-between">
                <p className="font-medium text-slate-800">{v.empresas?.nombre ?? "Cliente"}</p>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                  {ETIQUETA_RESULTADO[v.resultado] ?? v.resultado}
                </span>
              </div>
              <p className="text-xs text-slate-400">{new Date(v.timestamp_dispositivo).toLocaleTimeString("es-DO")}</p>
              {v.comentario && <p className="mt-1 text-sm text-slate-600">{v.comentario}</p>}
            </div>
          ))}
          {visitas.length === 0 && (
            <p className="py-6 text-center text-sm text-slate-400">Aún no has registrado visitas hoy.</p>
          )}
        </div>
      </div>
    </div>
  );
}
