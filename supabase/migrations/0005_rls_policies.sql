-- Helpers reutilizables, marcados `stable` para performance dentro de policies.
create or replace function public.fn_mi_rol() returns rol_usuario as $$
  select rol from public.usuarios where id = auth.uid();
$$ language sql stable security definer;

create or replace function public.fn_mis_vendedores() returns setof uuid as $$
  select id from public.usuarios where supervisor_id = auth.uid()
  union
  select auth.uid();
$$ language sql stable security definer;

alter table public.usuarios enable row level security;
alter table public.empresas enable row level security;
alter table public.patrones_recurrencia enable row level security;
alter table public.jornadas enable row level security;
alter table public.rutas enable row level security;
alter table public.ubicaciones enable row level security;
alter table public.eventos_desvio enable row level security;
alter table public.visitas enable row level security;
alter table public.mensajes enable row level security;
alter table public.gps_alertas enable row level security;
alter table public.dispositivos enable row level security;
alter table public.auditoria_empresas enable row level security;

-- ============================================================
-- USUARIOS
-- ============================================================
create policy "usuario_select_propio" on public.usuarios for select
  using (id = auth.uid());
create policy "supervisor_select_equipo_usuarios" on public.usuarios for select
  using (id in (select public.fn_mis_vendedores()));
create policy "oficina_full_usuarios" on public.usuarios for all
  using (public.fn_mi_rol() = 'admin_oficina') with check (public.fn_mi_rol() = 'admin_oficina');
create policy "usuario_update_campos_propios" on public.usuarios for update
  using (id = auth.uid()) with check (id = auth.uid());

-- ============================================================
-- EMPRESAS — Patrón: doble propietario. Vendedor CRUD total sobre lo propio,
-- oficina CRUD total sobre TODO el catálogo (requisito explícito del usuario).
-- Un vendedor NO puede leer el catálogo de otro (privacidad comercial de su cartera).
-- ============================================================
create policy "vendedor_crud_propia_empresa" on public.empresas for all
  using (vendedor_id = auth.uid()) with check (vendedor_id = auth.uid());
create policy "supervisor_select_empresas_equipo" on public.empresas for select
  using (vendedor_id in (select public.fn_mis_vendedores()));
create policy "oficina_full_empresas" on public.empresas for all
  using (public.fn_mi_rol() = 'admin_oficina') with check (public.fn_mi_rol() = 'admin_oficina');

-- ============================================================
-- PATRONES DE RECURRENCIA — propiedad exclusiva del vendedor, oficina solo lectura (seguimiento)
-- ============================================================
create policy "vendedor_crud_propio_patron" on public.patrones_recurrencia for all
  using (vendedor_id = auth.uid()) with check (vendedor_id = auth.uid());
create policy "supervisor_select_patrones_equipo" on public.patrones_recurrencia for select
  using (vendedor_id in (select public.fn_mis_vendedores()));
create policy "oficina_select_patrones" on public.patrones_recurrencia for select
  using (public.fn_mi_rol() = 'admin_oficina');

-- ============================================================
-- JORNADAS — propiedad exclusiva del vendedor, oficina solo lectura
-- ============================================================
create policy "vendedor_crud_propia_jornada" on public.jornadas for all
  using (vendedor_id = auth.uid()) with check (vendedor_id = auth.uid());
create policy "supervisor_select_jornadas_equipo" on public.jornadas for select
  using (vendedor_id in (select public.fn_mis_vendedores()));
create policy "oficina_select_jornadas" on public.jornadas for select
  using (public.fn_mi_rol() = 'admin_oficina');

-- ============================================================
-- RUTAS — Patrón: propiedad exclusiva del vendedor, oficina de SOLO LECTURA.
-- A propósito no existe policy "for all"/insert/update/delete para admin_oficina:
-- oficina hace seguimiento, nunca gestiona rutas.
-- ============================================================
create policy "vendedor_crud_propia_ruta" on public.rutas for all
  using (vendedor_id = auth.uid()) with check (vendedor_id = auth.uid());
create policy "supervisor_select_rutas_equipo" on public.rutas for select
  using (vendedor_id in (select public.fn_mis_vendedores()));
create policy "oficina_select_todas_rutas" on public.rutas for select
  using (public.fn_mi_rol() = 'admin_oficina');

-- ============================================================
-- UBICACIONES — propiedad individual del vendedor, oficina solo lectura
-- ============================================================
create policy "vendedor_insert_propia_ubicacion" on public.ubicaciones for insert
  with check (vendedor_id = auth.uid());
create policy "vendedor_select_propia_ubicacion" on public.ubicaciones for select
  using (vendedor_id = auth.uid());
create policy "supervisor_select_ubicacion_equipo" on public.ubicaciones for select
  using (vendedor_id in (select public.fn_mis_vendedores()));
create policy "oficina_select_ubicaciones" on public.ubicaciones for select
  using (public.fn_mi_rol() = 'admin_oficina');

-- ============================================================
-- EVENTOS_DESVIO — vendedor inserta y completa su propio motivo; oficina solo lectura
-- ============================================================
create policy "vendedor_insert_propio_desvio" on public.eventos_desvio for insert
  with check (vendedor_id = auth.uid());
create policy "vendedor_select_propio_desvio" on public.eventos_desvio for select
  using (vendedor_id = auth.uid());
create policy "vendedor_update_motivo_propio_desvio" on public.eventos_desvio for update
  using (vendedor_id = auth.uid()) with check (vendedor_id = auth.uid());
create policy "supervisor_select_desvios_equipo" on public.eventos_desvio for select
  using (vendedor_id in (select public.fn_mis_vendedores()));
create policy "oficina_select_desvios" on public.eventos_desvio for select
  using (public.fn_mi_rol() = 'admin_oficina');

-- ============================================================
-- VISITAS — propiedad exclusiva del vendedor, oficina solo lectura
-- ============================================================
create policy "vendedor_crud_propia_visita" on public.visitas for all
  using (vendedor_id = auth.uid()) with check (vendedor_id = auth.uid());
create policy "supervisor_select_visitas_equipo" on public.visitas for select
  using (vendedor_id in (select public.fn_mis_vendedores()));
create policy "oficina_select_todas_visitas" on public.visitas for select
  using (public.fn_mi_rol() = 'admin_oficina');

-- ============================================================
-- MENSAJES — solo los participantes de la conversación
-- ============================================================
create policy "participante_select_mensajes" on public.mensajes for select
  using (emisor_id = auth.uid() or receptor_id = auth.uid());
create policy "participante_insert_mensajes" on public.mensajes for insert
  with check (emisor_id = auth.uid());
create policy "receptor_marca_leido" on public.mensajes for update
  using (receptor_id = auth.uid()) with check (receptor_id = auth.uid());

-- ============================================================
-- GPS_ALERTAS — vendedor solo lectura de las suyas; oficina ALL (única tabla,
-- junto con empresas, donde oficina escribe: necesita poder "resolver" alertas)
-- ============================================================
create policy "vendedor_select_propia_alerta" on public.gps_alertas for select
  using (vendedor_id = auth.uid());
create policy "supervisor_select_alertas_equipo" on public.gps_alertas for select
  using (vendedor_id in (select public.fn_mis_vendedores()));
create policy "oficina_full_alertas" on public.gps_alertas for all
  using (public.fn_mi_rol() = 'admin_oficina') with check (public.fn_mi_rol() = 'admin_oficina');

-- ============================================================
-- DISPOSITIVOS — CRUD propio; oficina solo lectura (para poder enviar push)
-- ============================================================
create policy "usuario_crud_propio_dispositivo" on public.dispositivos for all
  using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());
create policy "oficina_select_dispositivos" on public.dispositivos for select
  using (public.fn_mi_rol() = 'admin_oficina');

-- ============================================================
-- AUDITORIA_EMPRESAS — solo admin_oficina puede leerla; nadie inserta manualmente
-- (la inserta el trigger fn_auditar_cambio_empresa con security definer)
-- ============================================================
create policy "oficina_select_auditoria" on public.auditoria_empresas for select
  using (public.fn_mi_rol() = 'admin_oficina');
