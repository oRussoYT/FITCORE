-- Avaliações reais da plataforma, feitas por usuários logados e moderadas pelo admin.
-- Só avaliações aprovadas aparecem na homepage. Nada de depoimento inventado.

create table public.platform_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  body text not null check (char_length(body) between 10 and 600),
  display_name text not null check (char_length(display_name) between 2 and 60),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  moderated_at timestamptz
);
create index platform_reviews_status_idx on public.platform_reviews (status, created_at desc);

alter table public.platform_reviews enable row level security;

-- O autor vê e edita a própria avaliação; qualquer edição volta para moderação.
create policy reviews_select_own on public.platform_reviews for select to authenticated
  using (user_id = (select auth.uid()));
create policy reviews_insert_own on public.platform_reviews for insert to authenticated
  with check (user_id = (select auth.uid()) and status = 'pending');
create policy reviews_update_own on public.platform_reviews for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()) and status = 'pending');
create policy reviews_delete_own on public.platform_reviews for delete to authenticated
  using (user_id = (select auth.uid()));

create or replace function public.reviews_force_pending()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Mudanças feitas pelo autor sempre voltam para "pendente".
  if current_setting('fitcore.moderating', true) is distinct from 'on' then
    new.status := 'pending';
    new.moderated_at := null;
  end if;
  new.updated_at := now();
  return new;
end;
$$;
create trigger platform_reviews_pending before insert or update on public.platform_reviews
  for each row execute function public.reviews_force_pending();

grant select, insert, update, delete on public.platform_reviews to authenticated;
revoke all on public.platform_reviews from anon;

-- Leitura pública somente das aprovadas, sem expor quem é o usuário.
create or replace function public.public_reviews(p_limit int default 12)
returns table (id uuid, rating smallint, body text, display_name text, created_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select r.id, r.rating, r.body, r.display_name, r.created_at
  from public.platform_reviews r
  where r.status = 'approved'
  order by r.created_at desc
  limit least(greatest(p_limit, 1), 50);
$$;
grant execute on function public.public_reviews(int) to anon, authenticated;

-- Moderação (admin com 2 fatores).
create or replace function public.admin_list_reviews()
returns table (id uuid, email text, rating smallint, body text, display_name text, status text, created_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.assert_platform_admin('list_reviews');
  return query
  select r.id, u.email::text, r.rating, r.body, r.display_name, r.status, r.created_at
  from public.platform_reviews r left join auth.users u on u.id = r.user_id
  order by (r.status = 'pending') desc, r.created_at desc
  limit 200;
end;
$$;

create or replace function public.admin_moderate_review(p_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_status not in ('approved', 'rejected', 'pending') then
    raise exception 'status inválido' using errcode = '22023';
  end if;
  perform private.assert_platform_admin('moderate_review', jsonb_build_object('id', p_id, 'status', p_status));
  perform set_config('fitcore.moderating', 'on', true);
  update public.platform_reviews set status = p_status, moderated_at = now() where id = p_id;
  perform set_config('fitcore.moderating', 'off', true);
end;
$$;

revoke execute on function public.admin_list_reviews() from public, anon;
revoke execute on function public.admin_moderate_review(uuid, text) from public, anon;
grant execute on function public.admin_list_reviews() to authenticated;
grant execute on function public.admin_moderate_review(uuid, text) to authenticated;
