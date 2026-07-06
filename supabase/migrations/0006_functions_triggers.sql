-- ============================================================
-- Actualiza jornadas.ultima_ubicacion_at en cada ping GPS (detecta GPS apagado)
-- ============================================================
create or replace function public.fn_actualizar_ultima_ubicacion()
returns trigger as $$
begin
  update public.jornadas
    set ultima_ubicacion_at = new.timestamp_dispositivo, gps_activo = true
    where id = new.jornada_id;
  return new;
end;
$$ language plpgsql security definer;

create trigger trg_actualizar_ultima_ubicacion
  after insert on public.ubicaciones
  for each row execute function public.fn_actualizar_ultima_ubicacion();

-- ============================================================
-- Detección de empresas duplicadas por proximidad + similitud de nombre.
-- SECURITY DEFINER: compara contra el catálogo de TODOS los vendedores (privado
-- entre sí por RLS), pero solo expone campos mínimos de aviso, nunca la ficha completa.
-- ============================================================
create or replace function public.fn_buscar_empresas_similares(
  p_nombre text, p_lat double precision, p_lng double precision, p_radio_metros int default 150
)
returns table (
  empresa_id uuid,
  nombre text,
  distancia_metros double precision,
  similitud real,
  es_propia boolean,
  ya_visitada boolean
) as $$
  select e.id, e.nombre,
         ST_Distance(e.ubicacion, ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography) as distancia_metros,
         similarity(e.nombre_normalizado, lower(unaccent(p_nombre))) as similitud,
         (e.vendedor_id = auth.uid()) as es_propia,
         exists(select 1 from public.visitas v where v.empresa_id = e.id) as ya_visitada
  from public.empresas e
  where ST_DWithin(e.ubicacion, ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography, p_radio_metros)
     or similarity(e.nombre_normalizado, lower(unaccent(p_nombre))) > 0.4
  order by distancia_metros asc nulls last
  limit 5;
$$ language sql stable security definer;

revoke all on function public.fn_buscar_empresas_similares from public;
grant execute on function public.fn_buscar_empresas_similares to authenticated;

-- ============================================================
-- Validación server-side de timestamps de dispositivo (defensa contra relojes
-- desincronizados o manipulados). Ventana amplia de 24h porque el modo offline
-- puede acumular eventos por horas antes de sincronizar.
-- ============================================================
create or replace function public.fn_validar_timestamp_dispositivo()
returns trigger as $$
begin
  if abs(extract(epoch from (now() - new.timestamp_dispositivo))) > 86400 then
    raise exception 'timestamp_dispositivo fuera de rango aceptable (posible reloj desincronizado)';
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_validar_ts_ubicaciones before insert on public.ubicaciones
  for each row execute function public.fn_validar_timestamp_dispositivo();
create trigger trg_validar_ts_visitas before insert on public.visitas
  for each row execute function public.fn_validar_timestamp_dispositivo();
create trigger trg_validar_ts_desvios before insert on public.eventos_desvio
  for each row execute function public.fn_validar_timestamp_dispositivo();

-- ============================================================
-- Auditoría de cambios en empresas (oficina puede editar el catálogo de cualquier vendedor)
-- ============================================================
create or replace function public.fn_auditar_cambio_empresa()
returns trigger as $$
begin
  -- Cambios sin usuario autenticado (backfills/migraciones corridas desde el SQL
  -- Editor, jobs del sistema) no se auditan: no hay un usuario real al cual
  -- atribuirlos, y usuario_id es NOT NULL.
  if auth.uid() is null then
    return coalesce(new, old);
  end if;

  insert into public.auditoria_empresas (empresa_id, usuario_id, accion, datos_anteriores, datos_nuevos)
  values (
    coalesce(new.id, old.id), auth.uid(), lower(tg_op),
    case when tg_op <> 'INSERT' then to_jsonb(old) end,
    case when tg_op <> 'DELETE' then to_jsonb(new) end
  );
  return coalesce(new, old);
end;
$$ language plpgsql security definer;

create trigger trg_auditar_empresa
  after insert or update or delete on public.empresas
  for each row execute function public.fn_auditar_cambio_empresa();
