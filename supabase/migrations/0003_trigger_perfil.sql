-- Crea automáticamente una fila en perfiles cuando alguien se registra en Supabase Auth.
create or replace function crear_perfil_nuevo_usuario()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.perfiles (id, nombre, rol)
  values (new.id, new.raw_user_meta_data->>'nombre', 'estudiante');
  return new;
end;
$$;

drop trigger if exists al_crear_usuario on auth.users;
create trigger al_crear_usuario
  after insert on auth.users
  for each row execute function crear_perfil_nuevo_usuario();

-- Para convertir manualmente a alguien en psicólogo asesor o admin, corre en el SQL Editor:
-- update perfiles set rol = 'psicologo_asesor' where id = '<uuid del usuario>';
