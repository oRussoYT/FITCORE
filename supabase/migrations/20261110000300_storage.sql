-- Armazenamento privado de fotos.
-- Caminho obrigatório dos arquivos: <student_id>/<nome-do-arquivo>
-- As imagens só são exibidas por URLs assinadas e temporárias (nunca públicas).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('body-photos', 'body-photos', false, 15728640, array['image/jpeg', 'image/png', 'image/webp']),
  ('avatars', 'avatars', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create or replace function public.storage_student_folder(p_name text)
returns uuid
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_first text := split_part(p_name, '/', 1);
begin
  if v_first ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return v_first::uuid;
  end if;
  return null;
end;
$$;

-- Fotos corporais: aluno dono envia/apaga; aluno e personal vinculado visualizam.
create policy body_photos_read on storage.objects for select to authenticated
  using (bucket_id = 'body-photos' and public.can_view_student_photos(public.storage_student_folder(name)));
create policy body_photos_upload on storage.objects for insert to authenticated
  with check (bucket_id = 'body-photos' and public.storage_student_folder(name) = public.my_student_id());
create policy body_photos_remove on storage.objects for delete to authenticated
  using (bucket_id = 'body-photos' and public.storage_student_folder(name) = public.my_student_id());

-- Avatares: pasta = id do usuário. Visíveis para quem pode ver o perfil.
create policy avatars_read on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and public.can_view_profile(public.storage_student_folder(name)));
create policy avatars_upload on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and public.storage_student_folder(name) = (select auth.uid()));
create policy avatars_update on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and public.storage_student_folder(name) = (select auth.uid()))
  with check (bucket_id = 'avatars' and public.storage_student_folder(name) = (select auth.uid()));
create policy avatars_remove on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and public.storage_student_folder(name) = (select auth.uid()));
