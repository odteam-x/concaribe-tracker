-- Puntos de referencia administrativos (almacenes, oficinas propias, locales, etc.)
-- que Oficina agrega directamente sobre el mapa, independientes del catálogo de
-- empresas/clientes de cada vendedor. Visibles para todos los roles (útil para que
-- el vendedor sepa dónde está el almacén, por ejemplo), pero solo admin_oficina escribe.

create type categoria_ubicacion_referencia as enum ('empresa', 'almacen', 'local', 'otro');

create table public.ubicaciones_referencia (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  categoria categoria_ubicacion_referencia not null default 'otro',
  direccion text,
  ubicacion geography(Point, 4326) not null,
  notas text,
  creado_por uuid not null references public.usuarios(id),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create index idx_ubicaciones_referencia_categoria on public.ubicaciones_referencia(categoria);
create index idx_ubicaciones_referencia_ubicacion on public.ubicaciones_referencia using gist (ubicacion);

alter table public.ubicaciones_referencia enable row level security;

create policy "todos_los_autenticados_select_ubicaciones_ref"
  on public.ubicaciones_referencia for select
  using (auth.role() = 'authenticated');

create policy "admin_full_ubicaciones_ref"
  on public.ubicaciones_referencia for all
  using (public.fn_mi_rol() = 'admin_oficina')
  with check (public.fn_mi_rol() = 'admin_oficina');
