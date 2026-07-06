-- Las columnas geography(Point) de PostGIS, al leerse vía PostgREST/supabase-js, NO
-- vuelven de forma confiable como texto "POINT(lng lat)" (pueden llegar como EWKB hex
-- o GeoJSON según versión), lo que hacía que el parseo en el cliente devolviera 0,0 y
-- Google Directions respondiera ZERO_RESULTS. Solución: columnas lat/lng numéricas
-- explícitas, mantenidas en sync por trigger, que el cliente lee directamente.

-- ============ empresas ============
alter table public.empresas add column if not exists lat double precision;
alter table public.empresas add column if not exists lng double precision;

-- ============ ubicaciones_referencia ============
alter table public.ubicaciones_referencia add column if not exists lat double precision;
alter table public.ubicaciones_referencia add column if not exists lng double precision;

-- ============ ubicaciones (tracking GPS) ============
alter table public.ubicaciones add column if not exists lat double precision;
alter table public.ubicaciones add column if not exists lng double precision;

-- Trigger genérico: rellena lat/lng desde la columna geography indicada por el
-- primer argumento del trigger ('ubicacion' o 'punto').
create or replace function public.fn_sync_latlng()
returns trigger as $$
declare
  col text := tg_argv[0];
  geo geography;
begin
  execute format('select ($1).%I', col) into geo using new;
  if geo is not null then
    new.lat := ST_Y(geo::geometry);
    new.lng := ST_X(geo::geometry);
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_sync_latlng_empresas
  before insert or update on public.empresas
  for each row execute function public.fn_sync_latlng('ubicacion');

create trigger trg_sync_latlng_ubicaciones_ref
  before insert or update on public.ubicaciones_referencia
  for each row execute function public.fn_sync_latlng('ubicacion');

create trigger trg_sync_latlng_ubicaciones
  before insert or update on public.ubicaciones
  for each row execute function public.fn_sync_latlng('punto');

-- Backfill de las filas ya existentes.
update public.empresas set lat = ST_Y(ubicacion::geometry), lng = ST_X(ubicacion::geometry);
update public.ubicaciones_referencia set lat = ST_Y(ubicacion::geometry), lng = ST_X(ubicacion::geometry);
update public.ubicaciones set lat = ST_Y(punto::geometry), lng = ST_X(punto::geometry);
