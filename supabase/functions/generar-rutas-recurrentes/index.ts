// Corre diario via pg_cron (ver 0007_views_metrics.sql), de madrugada.
//
// IMPORTANTE (modelo vendedor-dueño-de-ruta): esta función NUNCA crea filas en
// "rutas" — el vendedor siempre debe confirmar/ajustar antes de iniciar tracking,
// nunca se le asigna una ruta cerrada sin su acción. Su único trabajo es enviar
// un recordatorio push al vendedor cuando hoy coincide con un patrón recurrente
// propio activo, sugiriéndole abrir "Iniciar ruta" con esa selección precargada.
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3";

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  webpush.setVapidDetails(
    Deno.env.get("VAPID_SUBJECT")!,
    Deno.env.get("VAPID_PUBLIC_KEY")!,
    Deno.env.get("VAPID_PRIVATE_KEY")!
  );

  const hoy = new Date();
  const diaSemana = hoy.getDay(); // 0=domingo..6=sábado
  const fechaHoy = hoy.toISOString().slice(0, 10);

  const { data: patrones, error } = await supabase
    .from("patrones_recurrencia")
    .select("id, vendedor_id, nombre, dias_semana, fecha_inicio, fecha_fin")
    .eq("activo", true)
    .contains("dias_semana", [diaSemana])
    .lte("fecha_inicio", fechaHoy)
    .or(`fecha_fin.is.null,fecha_fin.gte.${fechaHoy}`);

  if (error) {
    console.error("Error consultando patrones_recurrencia:", error.message);
    return new Response("error", { status: 500 });
  }

  for (const patron of patrones ?? []) {
    // Evita recordatorio duplicado si el vendedor ya inició una ruta hoy
    const { data: rutaHoy } = await supabase
      .from("rutas")
      .select("id")
      .eq("vendedor_id", patron.vendedor_id)
      .eq("fecha", fechaHoy)
      .maybeSingle();

    if (rutaHoy) continue;

    const { data: dispositivos } = await supabase
      .from("dispositivos")
      .select("endpoint, p256dh, auth")
      .eq("usuario_id", patron.vendedor_id)
      .eq("activo", true);

    for (const d of dispositivos ?? []) {
      await webpush
        .sendNotification(
          { endpoint: d.endpoint, keys: { p256dh: d.p256dh, auth: d.auth } },
          JSON.stringify({
            title: "Recordatorio de ruta",
            body: `Hoy toca tu ruta recurrente "${patron.nombre}". Ábrela para confirmar o ajustar.`,
            url: "/ruta/iniciar",
          })
        )
        .catch((err: unknown) => console.error("Push fallido:", err));
    }
  }

  return new Response("ok");
});
