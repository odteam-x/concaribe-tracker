// Las 3 funciones de este proyecto se despliegan con --no-verify-jwt porque pg_cron
// (net.http_post) no puede enviar un JWT de Supabase. En su lugar, se protegen con un
// secreto compartido simple: pg_cron lo manda en el header "x-cron-secret" (ver
// supabase/migrations/0007_views_metrics.sql) y la función lo compara contra su propio
// secreto (CRON_SECRET, seteado vía `supabase secrets set`). Sin esto, cualquiera en
// internet podría invocar el endpoint público y disparar pushes o alertas falsas.
export function verificarSecretoCron(req: Request): Response | null {
  const secretoEsperado = Deno.env.get("CRON_SECRET");
  const secretoRecibido = req.headers.get("x-cron-secret");

  if (!secretoEsperado || secretoRecibido !== secretoEsperado) {
    return new Response("No autorizado", { status: 401 });
  }
  return null;
}
