-- ============================================================
-- Vista materializada: km recorridos por vendedor/día. Evita recalcular
-- ST_MakeLine sobre todo el historial de ubicaciones en cada request del dashboard.
-- ============================================================
create materialized view public.mv_metricas_diarias as
select
  vendedor_id,
  date(timestamp_dispositivo) as fecha,
  ST_Length(ST_MakeLine(punto::geometry order by timestamp_dispositivo)::geography) / 1000.0 as km_recorridos
from public.ubicaciones
group by vendedor_id, date(timestamp_dispositivo);

create unique index on public.mv_metricas_diarias (vendedor_id, fecha);

-- ============================================================
-- Función de progreso del día (planificados / visitados / agregados) para el
-- contador del panel Vendedor y el dashboard de oficina.
-- "Planificado" = la empresa estaba en orden_visitas al confirmar la ruta;
-- "agregado" = se visitó sin haber estado en esa lista original.
-- ============================================================
create or replace function public.fn_progreso_ruta(p_vendedor_id uuid, p_fecha date)
returns table (
  ruta_id uuid,
  total_planificados int,
  visitados_planificados bigint,
  agregados_visitados bigint
) as $$
  select
    r.id,
    cardinality(r.orden_visitas),
    count(v.id) filter (where v.empresa_id = any(r.orden_visitas)),
    count(v.id) filter (where not (v.empresa_id = any(r.orden_visitas)))
  from public.rutas r
  left join public.visitas v on v.ruta_id = r.id
  where r.vendedor_id = p_vendedor_id and r.fecha = p_fecha
  group by r.id, r.orden_visitas;
$$ language sql stable security invoker;

-- ============================================================
-- Cron jobs
-- ============================================================

-- Refrescar métricas diarias cada hora
select cron.schedule('refresh-mv-metricas', '0 * * * *',
  $$ refresh materialized view concurrently public.mv_metricas_diarias $$);

-- Retención de ubicaciones: purgar detalle crudo > 90 días (ya agregado en mv_metricas_diarias)
select cron.schedule('purgar-ubicaciones-antiguas', '0 3 * * *',
  $$ delete from public.ubicaciones where timestamp_dispositivo < now() - interval '90 days' $$);

-- Detección de GPS apagado (Edge Function, cada 5 min)
-- IMPORTANTE: reemplazar <project-ref> por el ref real del proyecto Supabase antes de aplicar.
select cron.schedule('detectar-gps-apagado', '*/5 * * * *',
  $$ select net.http_post(url := 'https://<project-ref>.functions.supabase.co/detectar-gps-apagado') $$);

-- Recordatorio de ruta recurrente propia del vendedor (diario, madrugada; nunca crea rutas)
select cron.schedule('generar-rutas-recurrentes', '30 5 * * *',
  $$ select net.http_post(url := 'https://<project-ref>.functions.supabase.co/generar-rutas-recurrentes') $$);

-- Recordatorio de desvío sin motivo completado (cada 10 min)
select cron.schedule('recordatorio-desvio-pendiente', '*/10 * * * *',
  $$ select net.http_post(url := 'https://<project-ref>.functions.supabase.co/enviar-push?tipo=desvio_pendiente') $$);

-- Recordatorio de visitas pendientes en horario laboral (cada 30 min, 9am-7pm)
select cron.schedule('recordatorio-visitas-pendientes', '*/30 9-19 * * *',
  $$ select net.http_post(url := 'https://<project-ref>.functions.supabase.co/enviar-push?tipo=visitas_pendientes') $$);

-- Recordatorio de check-out de fin de jornada (18:00)
select cron.schedule('recordatorio-fin-jornada', '0 18 * * *',
  $$ select net.http_post(url := 'https://<project-ref>.functions.supabase.co/enviar-push?tipo=fin_jornada') $$);
