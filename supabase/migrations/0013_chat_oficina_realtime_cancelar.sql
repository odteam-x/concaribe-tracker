-- ============================================================
-- 1) Estado "cancelada" para rutas (botón Cancelar ruta del vendedor)
-- ============================================================
alter type estado_ruta add value if not exists 'cancelada';

-- ============================================================
-- 2) Chat colectivo con oficina: cualquier admin_oficina ve y participa en la
-- conversación de cualquier vendedor (el hilo se identifica por el vendedor,
-- no por el par exacto emisor/receptor). El vendedor sigue viendo solo lo suyo
-- vía la política "participante" existente.
-- ============================================================
create policy "oficina_select_todos_mensajes" on public.mensajes for select
  using (public.fn_mi_rol() = 'admin_oficina');

create policy "oficina_update_leido_mensajes" on public.mensajes for update
  using (public.fn_mi_rol() = 'admin_oficina')
  with check (public.fn_mi_rol() = 'admin_oficina');

-- ============================================================
-- 3) Realtime: publicar los cambios de las tablas clave para que los paneles se
-- actualicen solos (sin refresh). Idempotente: ignora las que ya estén publicadas.
-- ============================================================
do $$
declare
  t text;
begin
  foreach t in array array[
    'mensajes', 'ubicaciones', 'visitas', 'rutas', 'jornadas',
    'gps_alertas', 'eventos_desvio', 'empresas', 'ubicaciones_referencia', 'usuarios'
  ]
  loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception
      when duplicate_object then null;
    end;
  end loop;
end $$;

-- ============================================================
-- 4) Km recorridos EN VIVO: la versión anterior leía mv_metricas_diarias (refrescada
-- por cron cada hora), por lo que los reportes salían vacíos el mismo día. Con el
-- volumen actual se puede calcular directo de ubicaciones sin problema.
-- ============================================================
create or replace function public.fn_metricas_km_recorridos(p_desde date, p_hasta date, p_vendedor_id uuid default null)
returns table (vendedor_id uuid, fecha date, km_recorridos numeric) as $$
  select
    u.vendedor_id,
    (u.timestamp_dispositivo at time zone 'utc')::date as fecha,
    round((ST_Length(ST_MakeLine(u.punto::geometry order by u.timestamp_dispositivo)::geography) / 1000.0)::numeric, 2)
  from public.ubicaciones u
  where (u.timestamp_dispositivo at time zone 'utc')::date between p_desde and p_hasta
    and (p_vendedor_id is null or u.vendedor_id = p_vendedor_id)
  group by u.vendedor_id, (u.timestamp_dispositivo at time zone 'utc')::date
  order by fecha;
$$ language sql stable security invoker;
