-- Auto-provisioning: al invitar/crear un usuario en auth.users (vía Admin API,
-- ver api/usuarios/invitar/route.ts), este trigger crea automáticamente su fila en
-- public.usuarios leyendo rol/nombre/telefono/supervisor_id de raw_user_meta_data
-- (pasados al invitar). Si falta algo, cae a un default seguro: rol 'vendedor'.
create or replace function public.fn_manejar_nuevo_usuario()
returns trigger as $$
begin
  insert into public.usuarios (id, rol, nombre, email, telefono, supervisor_id)
  values (
    new.id,
    coalesce((new.raw_user_meta_data->>'rol')::rol_usuario, 'vendedor'),
    coalesce(new.raw_user_meta_data->>'nombre', split_part(new.email, '@', 1)),
    new.email,
    nullif(new.raw_user_meta_data->>'telefono', ''),
    nullif(new.raw_user_meta_data->>'supervisor_id', '')::uuid
  );
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger trg_nuevo_usuario
  after insert on auth.users
  for each row execute function public.fn_manejar_nuevo_usuario();
