create type rol_usuario as enum ('admin_oficina', 'supervisor', 'vendedor');
create type resultado_visita as enum ('interesado', 'no_interesado', 'seguimiento', 'cerrado', 'otro');
create type tipo_alerta as enum ('gps_apagado', 'jornada_sin_checkout', 'desvio_sin_motivo');
create type frecuencia_recurrencia as enum ('semanal');
create type estado_ruta as enum ('pendiente', 'en_curso', 'finalizada');
