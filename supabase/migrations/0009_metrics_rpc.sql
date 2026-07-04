-- Funciones RPC que envuelven las queries de métricas/heatmap (sección 8 del plan)
-- para poder invocarlas desde supabase-js con `.rpc(...)`, respetando RLS (security invoker).

create or replace function public.fn_metricas_km_recorridos(p_desde date, p_hasta date, p_vendedor_id uuid default null)
returns table (vendedor_id uuid, fecha date, km_recorridos numeric) as $$
  select vendedor_id, fecha, round(km_recorridos::numeric, 2)
  from public.mv_metricas_diarias
  where fecha between p_desde and p_hasta
    and (p_vendedor_id is null or vendedor_id = p_vendedor_id)
  order by fecha;
$$ language sql stable security invoker;

create or replace function public.fn_metricas_tiempo_por_visita(p_desde date, p_hasta date)
returns table (vendedor_id uuid, minutos_promedio_por_visita numeric, total_visitas bigint) as $$
  select vendedor_id, round((avg(duracion_segundos) / 60.0)::numeric, 1), count(*)
  from public.visitas
  where timestamp_dispositivo::date between p_desde and p_hasta
  group by vendedor_id;
$$ language sql stable security invoker;

create or replace function public.fn_metricas_visitas_por_dia(p_desde date, p_hasta date)
returns table (vendedor_id uuid, fecha date, total_visitas bigint, cerradas bigint) as $$
  select vendedor_id, timestamp_dispositivo::date, count(*),
         count(*) filter (where resultado = 'cerrado')
  from public.visitas
  where timestamp_dispositivo::date between p_desde and p_hasta
  group by vendedor_id, timestamp_dispositivo::date
  order by timestamp_dispositivo::date;
$$ language sql stable security invoker;

create or replace function public.fn_metricas_conversion(p_desde date, p_hasta date)
returns table (vendedor_id uuid, interesados bigint, cerrados bigint, tasa_conversion_pct numeric) as $$
  with base as (
    select vendedor_id,
      count(*) filter (where resultado = 'interesado') as interesados,
      count(*) filter (where resultado = 'cerrado') as cerrados
    from public.visitas
    where timestamp_dispositivo::date between p_desde and p_hasta
    group by vendedor_id
  )
  select vendedor_id, interesados, cerrados,
    case when interesados = 0 then 0 else round(100.0 * cerrados / nullif(interesados, 0), 2) end
  from base;
$$ language sql stable security invoker;

create or replace function public.fn_heatmap_visitas(p_desde date, p_hasta date, p_vendedor_id uuid default null)
returns table (lat double precision, lng double precision) as $$
  select ST_Y(ubicacion::geometry), ST_X(ubicacion::geometry)
  from public.visitas
  where timestamp_dispositivo::date between p_desde and p_hasta
    and (p_vendedor_id is null or vendedor_id = p_vendedor_id);
$$ language sql stable security invoker;

create or replace function public.fn_progreso_ruta_hoy(p_vendedor_id uuid)
returns table (
  ruta_id uuid, total_planificados int, visitados_planificados bigint, agregados_visitados bigint
) as $$
  select * from public.fn_progreso_ruta(p_vendedor_id, current_date);
$$ language sql stable security invoker;
