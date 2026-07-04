-- Los índices de cada tabla ya se crean junto a su CREATE TABLE en 0003_tables.sql.
-- Este archivo agrega únicamente índices compuestos adicionales que sirven a queries
-- de métricas/heatmap (sección 8 del plan) y no están cubiertos por los índices simples.

-- Métricas por vendedor + rango de fechas (km recorridos, visitas/día)
create index idx_visitas_vendedor_fecha_resultado
  on public.visitas(vendedor_id, (timestamp_dispositivo::date), resultado);

create index idx_ubicaciones_vendedor_fecha
  on public.ubicaciones(vendedor_id, (timestamp_dispositivo::date));

-- Heatmap filtrable opcionalmente por vendedor
create index idx_visitas_fecha_vendedor
  on public.visitas((timestamp_dispositivo::date), vendedor_id);

create index idx_auditoria_empresas_usuario on public.auditoria_empresas(usuario_id);
