-- Orden de creación por dependencias FK:
-- usuarios -> empresas -> patrones_recurrencia -> jornadas -> rutas -> ubicaciones
-- -> eventos_desvio -> visitas -> mensajes -> gps_alertas -> dispositivos

-- ============ USUARIOS ============
-- Extiende auth.users de Supabase (1:1) con datos de dominio
create table public.usuarios (
  id uuid primary key references auth.users(id) on delete cascade,
  rol rol_usuario not null default 'vendedor',
  nombre text not null,
  telefono text,
  email text not null,
  supervisor_id uuid references public.usuarios(id) on delete set null,
  activo boolean not null default true,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  constraint chk_supervisor_no_self check (supervisor_id is null or supervisor_id <> id)
);
create index idx_usuarios_supervisor on public.usuarios(supervisor_id);
create index idx_usuarios_rol on public.usuarios(rol);

-- ============ EMPRESAS ============
-- Catálogo de clientes/prospectos. Propiedad de un vendedor (vendedor_id).
-- Oficina (admin_oficina) tiene control total sobre el catálogo de cualquier vendedor.
create table public.empresas (
  id uuid primary key default gen_random_uuid(),
  vendedor_id uuid not null references public.usuarios(id) on delete cascade,
  nombre text not null,
  nombre_normalizado text generated always as (lower(public.fn_immutable_unaccent(nombre))) stored,
  direccion text,
  ubicacion geography(Point, 4326) not null,
  telefono text,
  categoria text,
  notas text,
  creado_por uuid not null references public.usuarios(id),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
create index idx_empresas_vendedor on public.empresas(vendedor_id);
create index idx_empresas_ubicacion on public.empresas using gist (ubicacion);
create index idx_empresas_nombre_trgm on public.empresas using gin (nombre_normalizado gin_trgm_ops);

-- ============ PATRONES DE RECURRENCIA ============
-- Plantillas propias del vendedor (conveniencia: "mi ruta típica de lunes"), no asignación de oficina.
create table public.patrones_recurrencia (
  id uuid primary key default gen_random_uuid(),
  vendedor_id uuid not null references public.usuarios(id) on delete cascade,
  nombre text not null,
  dias_semana int[] not null,                  -- 0=domingo..6=sábado
  frecuencia frecuencia_recurrencia not null default 'semanal',
  empresas_ids uuid[] not null,                 -- referencias a empresas del propio vendedor
  activo boolean not null default true,
  fecha_inicio date not null,
  fecha_fin date,
  creado_en timestamptz not null default now(),
  constraint chk_dias_semana check (dias_semana <@ array[0,1,2,3,4,5,6])
);
create index idx_patrones_vendedor on public.patrones_recurrencia(vendedor_id) where activo;

-- ============ JORNADAS ============
create table public.jornadas (
  id uuid primary key default gen_random_uuid(),
  vendedor_id uuid not null references public.usuarios(id) on delete cascade,
  fecha date not null,
  check_in timestamptz,
  check_in_ubicacion geography(Point, 4326),
  check_out timestamptz,
  check_out_ubicacion geography(Point, 4326),
  ultima_ubicacion_at timestamptz,
  gps_activo boolean not null default true,
  creado_en timestamptz not null default now(),
  unique (vendedor_id, fecha),
  constraint chk_checkout_after_checkin check (check_out is null or check_in is null or check_out >= check_in)
);
create index idx_jornadas_vendedor_fecha on public.jornadas(vendedor_id, fecha desc);
create index idx_jornadas_activas on public.jornadas(vendedor_id) where check_out is null;

-- ============ RUTAS ============
-- Siempre creadas por el vendedor (nunca por oficina). Referencian empresas por id, sin JSON embebido.
create table public.rutas (
  id uuid primary key default gen_random_uuid(),
  vendedor_id uuid not null references public.usuarios(id) on delete cascade,  -- = creador siempre
  fecha date not null,
  turno text not null default 'completo',
  orden_sugerido uuid[] not null default '{}',  -- waypoint optimization de Google Directions; solo referencia
  orden_visitas uuid[] not null,                -- orden final confirmado por el vendedor (array de empresa_id)
  polyline text,                                 -- encoded polyline generado sobre orden_visitas
  ruta_geom geography(LineString, 4326),
  patron_id uuid references public.patrones_recurrencia(id) on delete set null,
  estado estado_ruta not null default 'pendiente',
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  unique (vendedor_id, fecha, turno)
);
create index idx_rutas_vendedor_fecha on public.rutas(vendedor_id, fecha);
create index idx_rutas_fecha on public.rutas(fecha);
create index idx_rutas_geom on public.rutas using gist (ruta_geom);

-- ============ UBICACIONES (tracking GPS) ============
create table public.ubicaciones (
  id uuid primary key default gen_random_uuid(),
  vendedor_id uuid not null references public.usuarios(id) on delete cascade,
  jornada_id uuid references public.jornadas(id) on delete set null,
  punto geography(Point, 4326) not null,
  precision_metros numeric(6,2),
  velocidad_kmh numeric(6,2),
  timestamp_dispositivo timestamptz not null,
  timestamp_servidor timestamptz not null default now(),
  sincronizado_offline boolean not null default false,
  client_uuid uuid not null,                    -- generado en dispositivo, evita duplicados en upsert
  creado_en timestamptz not null default now(),
  unique (client_uuid)
);
create index idx_ubicaciones_vendedor_ts on public.ubicaciones(vendedor_id, timestamp_dispositivo desc);
create index idx_ubicaciones_punto on public.ubicaciones using gist (punto);
create index idx_ubicaciones_jornada on public.ubicaciones(jornada_id);

-- ============ EVENTOS DE DESVÍO ============
create table public.eventos_desvio (
  id uuid primary key default gen_random_uuid(),
  vendedor_id uuid not null references public.usuarios(id) on delete cascade,
  ruta_id uuid not null references public.rutas(id) on delete cascade,
  ubicacion geography(Point, 4326) not null,
  distancia_metros numeric(8,2) not null,
  timestamp_dispositivo timestamptz not null,
  motivo text,                                  -- nullable: se completa después, no bloquea la app
  motivo_completado_en timestamptz,
  sincronizado_offline boolean not null default false,
  client_uuid uuid not null,
  creado_en timestamptz not null default now(),
  unique (client_uuid),
  constraint chk_distancia_minima check (distancia_metros > 0)
);
create index idx_desvio_vendedor_ts on public.eventos_desvio(vendedor_id, timestamp_dispositivo desc);
create index idx_desvio_sin_motivo on public.eventos_desvio(vendedor_id) where motivo is null;

-- ============ VISITAS ============
-- "planificado" vs "agregado" se deriva comparando empresa_id contra rutas.orden_visitas (ver 0007_views_metrics.sql)
create table public.visitas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  ruta_id uuid references public.rutas(id) on delete set null,  -- null si se visita fuera de una ruta activa
  vendedor_id uuid not null references public.usuarios(id) on delete cascade,
  resultado resultado_visita not null,
  comentario text,
  foto_url text,                                -- path dentro del bucket privado, nunca una URL pública
  llegada_automatica boolean not null default false,
  llegada_timestamp timestamptz,
  ubicacion geography(Point, 4326) not null,
  timestamp_dispositivo timestamptz not null,
  duracion_segundos int,
  sincronizado_offline boolean not null default false,
  client_uuid uuid not null,
  creado_en timestamptz not null default now(),
  unique (client_uuid)
);
create index idx_visitas_vendedor_ts on public.visitas(vendedor_id, timestamp_dispositivo desc);
create index idx_visitas_empresa on public.visitas(empresa_id);
create index idx_visitas_ruta on public.visitas(ruta_id);
create index idx_visitas_resultado on public.visitas(resultado);
create index idx_visitas_ubicacion on public.visitas using gist (ubicacion);

-- ============ MENSAJES (chat) ============
create table public.mensajes (
  id uuid primary key default gen_random_uuid(),
  emisor_id uuid not null references public.usuarios(id) on delete cascade,
  receptor_id uuid not null references public.usuarios(id) on delete cascade,
  contenido text not null,
  leido boolean not null default false,
  leido_en timestamptz,
  timestamp timestamptz not null default now(),
  constraint chk_emisor_receptor_distintos check (emisor_id <> receptor_id)
);
create index idx_mensajes_conversacion on public.mensajes(least(emisor_id, receptor_id), greatest(emisor_id, receptor_id), timestamp desc);
create index idx_mensajes_receptor_no_leido on public.mensajes(receptor_id) where not leido;

-- ============ GPS ALERTAS ============
create table public.gps_alertas (
  id uuid primary key default gen_random_uuid(),
  vendedor_id uuid not null references public.usuarios(id) on delete cascade,
  jornada_id uuid references public.jornadas(id) on delete set null,
  tipo tipo_alerta not null,
  timestamp timestamptz not null default now(),
  minutos_sin_reportar int,
  resuelto boolean not null default false,
  resuelto_en timestamptz
);
create index idx_gps_alertas_vendedor on public.gps_alertas(vendedor_id, timestamp desc);
create index idx_gps_alertas_no_resueltas on public.gps_alertas(vendedor_id) where not resuelto;

-- ============ DISPOSITIVOS (Web Push subscriptions) ============
create table public.dispositivos (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.usuarios(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  activo boolean not null default true,
  creado_en timestamptz not null default now(),
  ultima_actividad timestamptz not null default now()
);
create index idx_dispositivos_usuario on public.dispositivos(usuario_id) where activo;

-- ============ AUDITORÍA DE EMPRESAS ============
-- Oficina tiene escritura total sobre el catálogo de cualquier vendedor: se audita cada cambio.
create table public.auditoria_empresas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  usuario_id uuid not null references public.usuarios(id),
  accion text not null,              -- 'insert' | 'update' | 'delete'
  datos_anteriores jsonb,
  datos_nuevos jsonb,
  creado_en timestamptz not null default now()
);
create index idx_auditoria_empresas_empresa on public.auditoria_empresas(empresa_id, creado_en desc);
