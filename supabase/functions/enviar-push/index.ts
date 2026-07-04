// Función genérica de envío de Web Push. Se invoca de dos formas distintas:
//
// 1) Database Webhook (Supabase) en "AFTER INSERT on mensajes": el payload trae
//    { type: "INSERT", table: "mensajes", record: {...} } y se notifica al receptor.
// 2) pg_cron con querystring ?tipo=desvio_pendiente | visitas_pendientes | fin_jornada,
//    para los recordatorios periódicos descritos en la sección 7.2 del plan.
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

webpush.setVapidDetails(
  Deno.env.get("VAPID_SUBJECT")!,
  Deno.env.get("VAPID_PUBLIC_KEY")!,
  Deno.env.get("VAPID_PRIVATE_KEY")!
);

async function notificarUsuario(usuarioId: string, payload: Record<string, unknown>) {
  const { data: dispositivos } = await supabase
    .from("dispositivos")
    .select("endpoint, p256dh, auth")
    .eq("usuario_id", usuarioId)
    .eq("activo", true);

  for (const d of dispositivos ?? []) {
    await webpush
      .sendNotification({ endpoint: d.endpoint, keys: { p256dh: d.p256dh, auth: d.auth } }, JSON.stringify(payload))
      .catch((err: unknown) => console.error("Push fallido:", err));
  }
}

async function manejarMensajeNuevo(record: { receptor_id: string; contenido: string }) {
  await notificarUsuario(record.receptor_id, {
    title: "Nuevo mensaje",
    body: record.contenido.slice(0, 120),
    url: "/mensajes",
  });
}

async function manejarDesvioPendiente() {
  const umbralMinutos = 30;
  const { data: desvios } = await supabase
    .from("eventos_desvio")
    .select("id, vendedor_id, timestamp_dispositivo")
    .is("motivo", null);

  const ahora = Date.now();
  for (const d of desvios ?? []) {
    const minutos = (ahora - new Date(d.timestamp_dispositivo).getTime()) / 60000;
    if (minutos >= umbralMinutos) {
      await notificarUsuario(d.vendedor_id, {
        title: "Desvío sin motivo",
        body: "Tienes un desvío de ruta sin motivo registrado. Complétalo cuando puedas.",
        url: "/ruta/activa",
      });
    }
  }
}

async function manejarVisitasPendientes() {
  const fechaHoy = new Date().toISOString().slice(0, 10);
  const { data: rutasActivas } = await supabase
    .from("rutas")
    .select("id, vendedor_id, orden_visitas")
    .eq("fecha", fechaHoy)
    .eq("estado", "en_curso");

  for (const ruta of rutasActivas ?? []) {
    const { count } = await supabase
      .from("visitas")
      .select("id", { count: "exact", head: true })
      .eq("ruta_id", ruta.id);

    if ((count ?? 0) < (ruta.orden_visitas?.length ?? 0)) {
      await notificarUsuario(ruta.vendedor_id, {
        title: "Visitas pendientes",
        body: "Aún tienes empresas planificadas sin visitar hoy.",
        url: "/ruta/activa",
      });
    }
  }
}

async function manejarFinJornada() {
  const fechaHoy = new Date().toISOString().slice(0, 10);
  const { data: jornadasSinCierre } = await supabase
    .from("jornadas")
    .select("vendedor_id")
    .eq("fecha", fechaHoy)
    .not("check_in", "is", null)
    .is("check_out", null);

  for (const j of jornadasSinCierre ?? []) {
    await notificarUsuario(j.vendedor_id, {
      title: "Fin de jornada",
      body: "No olvides hacer check-out antes de terminar el día.",
      url: "/jornada",
    });
  }
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const tipo = url.searchParams.get("tipo");

  if (tipo === "desvio_pendiente") {
    await manejarDesvioPendiente();
    return new Response("ok");
  }
  if (tipo === "visitas_pendientes") {
    await manejarVisitasPendientes();
    return new Response("ok");
  }
  if (tipo === "fin_jornada") {
    await manejarFinJornada();
    return new Response("ok");
  }

  // Database Webhook de "mensajes"
  const body = await req.json().catch(() => null);
  if (body?.table === "mensajes" && body?.type === "INSERT") {
    await manejarMensajeNuevo(body.record);
    return new Response("ok");
  }

  return new Response("tipo no reconocido", { status: 400 });
});
