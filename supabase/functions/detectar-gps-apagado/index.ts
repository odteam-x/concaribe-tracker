// Corre cada 5 min via pg_cron (ver 0007_views_metrics.sql).
// Revisa jornadas activas sin ping de GPS reciente, marca gps_activo=false,
// registra la alerta y notifica por Web Push a supervisor/admin_oficina.
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3";
import { verificarSecretoCron } from "../_shared/cronAuth.ts";

const UMBRAL_MINUTOS_SIN_GPS = 10;

Deno.serve(async (req) => {
  const noAutorizado = verificarSecretoCron(req);
  if (noAutorizado) return noAutorizado;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  webpush.setVapidDetails(
    Deno.env.get("VAPID_SUBJECT")!,
    Deno.env.get("VAPID_PUBLIC_KEY")!,
    Deno.env.get("VAPID_PRIVATE_KEY")!
  );

  const { data: jornadasActivas, error } = await supabase
    .from("jornadas")
    .select("id, vendedor_id, ultima_ubicacion_at, gps_activo")
    .is("check_out", null);

  if (error) {
    console.error("Error consultando jornadas activas:", error.message);
    return new Response("error", { status: 500 });
  }

  const ahora = Date.now();

  for (const jornada of jornadasActivas ?? []) {
    const minutosSinReportar = jornada.ultima_ubicacion_at
      ? (ahora - new Date(jornada.ultima_ubicacion_at).getTime()) / 60000
      : Infinity;

    if (minutosSinReportar >= UMBRAL_MINUTOS_SIN_GPS && jornada.gps_activo) {
      await supabase.from("jornadas").update({ gps_activo: false }).eq("id", jornada.id);

      await supabase.from("gps_alertas").insert({
        vendedor_id: jornada.vendedor_id,
        jornada_id: jornada.id,
        tipo: "gps_apagado",
        minutos_sin_reportar: Math.round(minutosSinReportar),
      });

      const { data: dispositivos } = await supabase
        .from("dispositivos")
        .select("endpoint, p256dh, auth, usuarios!inner(rol)")
        .eq("activo", true)
        .in("usuarios.rol", ["supervisor", "admin_oficina"]);

      for (const d of dispositivos ?? []) {
        await webpush
          .sendNotification(
            { endpoint: d.endpoint, keys: { p256dh: d.p256dh, auth: d.auth } },
            JSON.stringify({
              title: "GPS apagado",
              body: `Vendedor sin señal hace ${Math.round(minutosSinReportar)} min`,
            })
          )
          .catch((err: unknown) => {
            console.error("Push fallido (suscripción probablemente expirada):", err);
          });
      }
    }
  }

  return new Response("ok");
});
