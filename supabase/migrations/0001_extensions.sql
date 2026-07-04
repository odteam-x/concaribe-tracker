-- Extensiones necesarias: PostGIS para geolocalización, pg_cron para jobs programados,
-- pg_trgm + unaccent para búsqueda de empresas duplicadas por similitud de nombre.
create extension if not exists postgis;
create extension if not exists pg_cron;
create extension if not exists pgcrypto;
create extension if not exists pg_trgm;
create extension if not exists unaccent;

-- unaccent() viene marcada como STABLE (no IMMUTABLE) en Postgres, por lo que no puede
-- usarse directamente dentro de una columna generada (generated always as ... stored).
-- Este wrapper fija el diccionario 'unaccent' explícitamente y se declara IMMUTABLE,
-- el workaround estándar para este caso (usado en empresas.nombre_normalizado, 0003_tables.sql).
create or replace function public.fn_immutable_unaccent(text)
returns text
language sql
immutable
parallel safe
as $$
  select unaccent('unaccent', $1)
$$;
