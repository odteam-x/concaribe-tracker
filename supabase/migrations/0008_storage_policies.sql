-- Requiere haber creado antes el bucket "visitas-fotos" (privado) desde el dashboard
-- o vía API de Storage (ver README, sección de configuración). Path esperado:
-- {vendedor_id}/{client_uuid}-{nombre_archivo}

create policy "vendedor_sube_su_foto" on storage.objects for insert
  with check (bucket_id = 'visitas-fotos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "vendedor_lee_su_foto" on storage.objects for select
  using (bucket_id = 'visitas-fotos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "oficina_lee_todas_las_fotos" on storage.objects for select
  using (bucket_id = 'visitas-fotos' and public.fn_mi_rol() in ('admin_oficina', 'supervisor'));
