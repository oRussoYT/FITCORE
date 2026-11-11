-- Controle das academias pelo administrador da plataforma:
-- suspender/reativar academias, ver equipe e desativar membros.

alter table public.gyms
  add column if not exists suspended_at timestamptz,
  add column if not exists suspended_reason text check (suspended_reason is null or char_length(suspended_reason) <= 300);

-- O dono da academia só pode mudar nome e endereço curto; a suspensão é exclusiva da plataforma.
revoke update on public.gyms from authenticated;
grant update (name, slug) on public.gyms to authenticated;

-- Academia suspensa perde os poderes de gestão (o dono ainda vê o aviso, os alunos continuam com os próprios dados).
create or replace function public.is_gym_admin(p_gym uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.gym_members m
    join public.gyms g on g.id = m.gym_id
    where m.gym_id = p_gym and m.user_id = (select auth.uid()) and m.role = 'admin' and m.status = 'active'
      and g.suspended_at is null
  );
$$;

create or replace function public.is_gym_member(p_gym uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.gym_members m
    join public.gyms g on g.id = m.gym_id
    where m.gym_id = p_gym and m.user_id = (select auth.uid()) and m.status = 'active'
      and g.suspended_at is null
  );
$$;

create or replace function public.is_admin_of_student(p_student uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.students s
    join public.gym_members m on m.gym_id = s.gym_id
    join public.gyms g on g.id = s.gym_id
    where s.id = p_student and m.user_id = (select auth.uid()) and m.role = 'admin' and m.status = 'active'
      and g.suspended_at is null
  );
$$;

-- Lista de academias para o painel da plataforma (apenas cadastro e contagens).
create or replace function public.admin_list_gyms(p_search text default null)
returns table (
  id uuid, name text, slug text, created_at timestamptz, owner_email text,
  students int, trainers int, staff int, sessions_30d int, plans int,
  suspended_at timestamptz, suspended_reason text
)
language plpgsql security definer set search_path = '' as $$
begin
  perform private.assert_platform_admin('list_gyms', jsonb_build_object('search', p_search));
  return query
  select g.id, g.name, g.slug, g.created_at, u.email::text,
    (select count(*)::int from public.students s where s.gym_id = g.id),
    (select count(*)::int from public.gym_members m where m.gym_id = g.id and m.role = 'trainer' and m.status = 'active'),
    (select count(*)::int from public.gym_members m where m.gym_id = g.id and m.status = 'active'),
    (select count(*)::int from public.workout_sessions w join public.students s on s.id = w.student_id
       where s.gym_id = g.id and w.status = 'completed' and w.started_at > now() - interval '30 days'),
    (select count(*)::int from public.gym_plans p where p.gym_id = g.id),
    g.suspended_at, g.suspended_reason
  from public.gyms g
  left join auth.users u on u.id = g.created_by
  where p_search is null or p_search = '' or g.name ilike '%' || p_search || '%' or u.email ilike '%' || p_search || '%'
  order by g.created_at desc
  limit 200;
end;
$$;

create or replace function public.admin_set_gym_suspended(p_gym uuid, p_suspend boolean, p_reason text default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform private.assert_platform_admin(case when p_suspend then 'suspend_gym' else 'reactivate_gym' end,
    jsonb_build_object('gym', p_gym, 'reason', p_reason));
  update public.gyms
     set suspended_at = case when p_suspend then now() else null end,
         suspended_reason = case when p_suspend then nullif(left(trim(coalesce(p_reason, '')), 300), '') else null end
   where id = p_gym;
  if not found then raise exception 'academia não encontrada' using errcode = 'P0002'; end if;
end;
$$;

create or replace function public.admin_gym_members(p_gym uuid)
returns table (id uuid, user_id uuid, email text, full_name text, role text, status text, created_at timestamptz)
language plpgsql security definer set search_path = '' as $$
begin
  perform private.assert_platform_admin('view_gym_members', jsonb_build_object('gym', p_gym));
  return query
  select m.id, m.user_id, u.email::text, p.full_name, m.role::text, m.status::text, m.created_at
  from public.gym_members m
  left join auth.users u on u.id = m.user_id
  left join public.profiles p on p.id = m.user_id
  where m.gym_id = p_gym
  order by (m.role = 'admin') desc, m.created_at;
end;
$$;

create or replace function public.admin_set_member_status(p_member uuid, p_active boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform private.assert_platform_admin('set_member_status', jsonb_build_object('member', p_member, 'active', p_active));
  update public.gym_members set status = (case when p_active then 'active' else 'inactive' end)::public.member_status
   where id = p_member;
  if not found then raise exception 'membro não encontrado' using errcode = 'P0002'; end if;
end;
$$;

revoke execute on function public.admin_list_gyms(text) from public, anon;
revoke execute on function public.admin_set_gym_suspended(uuid, boolean, text) from public, anon;
revoke execute on function public.admin_gym_members(uuid) from public, anon;
revoke execute on function public.admin_set_member_status(uuid, boolean) from public, anon;
grant execute on function public.admin_list_gyms(text) to authenticated;
grant execute on function public.admin_set_gym_suspended(uuid, boolean, text) to authenticated;
grant execute on function public.admin_gym_members(uuid) to authenticated;
grant execute on function public.admin_set_member_status(uuid, boolean) to authenticated;
