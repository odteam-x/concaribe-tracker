-- ============================================================
-- 1) Nuevos resultados de visita: "visitado" (pasó pero sin resultado comercial
-- concreto) y "cotizado" (se le entregó/hizo una cotización).
-- ============================================================
alter type resultado_visita add value if not exists 'visitado';
alter type resultado_visita add value if not exists 'cotizado';

-- ============================================================
-- 2) DELETE del vendedor sobre sus propias visitas (corregir/borrar un registro
-- equivocado). La política "vendedor_crud_propia_visita" ya es FOR ALL, así que
-- el delete ya está cubierto; esto solo documenta la intención. Igual para empresas,
-- rutas, patrones y ubicaciones_referencia (todas con políticas FOR ALL de su dueño
-- + oficina). No hacen falta políticas nuevas para habilitar update/delete.
--
-- Lo que SÍ faltaba: al borrar un cliente (empresa) que ya tiene visitas o aparece
-- en el orden_visitas de una ruta, el FK de visitas es ON DELETE CASCADE (borra sus
-- visitas) — correcto. Pero rutas.orden_visitas es un uuid[] sin FK, así que puede
-- quedar apuntando a una empresa borrada. Eso NO rompe nada (el front filtra las
-- empresas inexistentes), pero lo dejamos anotado.
--
-- Nada que ejecutar en este bloque; queda como documentación de la revisión.
select 1;
