-- Extensiones necesarias: PostGIS para geolocalización, pg_cron para jobs programados,
-- pg_trgm + unaccent para búsqueda de empresas duplicadas por similitud de nombre.
create extension if not exists postgis;
create extension if not exists pg_cron;
create extension if not exists pgcrypto;
create extension if not exists pg_trgm;
create extension if not exists unaccent;
