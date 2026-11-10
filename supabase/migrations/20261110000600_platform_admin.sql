-- Administração da plataforma (acima das academias).
--
-- Segurança:
--   * Quem é admin fica só no banco. Nenhum e-mail de admin é gravado no código (repositório público).
--     Para autorizar: insert into private.platform_admin_emails (email) values ('...');  (via SQL Editor)
--   * As tabelas ficam no schema "private", que não é exposto pela API.
--   * Toda função administrativa exige: usuário admin + login com 2 fatores (aal2) na sessão atual.
--   * Cada chamada é registrada em private.platform_audit.
--   * Fotos corporais e conversas com a IA continuam inacessíveis, inclusive para o admin.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table private.platform_admin_emails (
  email text primary key check (email = lower(email))
);

create table private.platform_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table private.platform_audit (
  id bigint generated always as identity primary key,
  actor_id uuid,
  action text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table private.platform_admin_emails enable row level security;
alter table private.platform_admins enable row level security;
alter table private.platform_audit enable row level security;

-- Promove automaticamente quem se cadastrar com um e-mail autorizado (e confirmado).
create or replace function private.sync_platform_admin()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email is not null
     and new.email_confirmed_at is not null
     and exists (select 1 from private.platform_admin_emails e where e.email = lower(new.email)) then
    insert into private.platform_admins (user_id) values (new.id) on conflict do nothing;
  end if;
  return new;
end;
$$;

create trigger on_auth_user_admin_sync
  after insert or update of email, email_confirmed_at on auth.users
  for each row execute function private.sync_platform_admin();

-- Também promove ao cadastrar o e-mail depois que a conta já existe.
create or replace function private.sync_admin_from_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into private.platform_admins (user_id)
  select u.id from auth.users u
  where lower(u.email) = new.email and u.email_confirmed_at is not null
  on conflict do nothing;
  return new;
end;
$$;

create trigger on_admin_email_added
  after insert on private.platform_admin_emails
  for each row execute function private.sync_admin_from_email();

-- ---------------------------------------------------------------------------
-- Verificações
-- ---------------------------------------------------------------------------
create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from private.platform_admins a where a.user_id = (select auth.uid()));
$$;

create or replace function private.assert_platform_admin(p_action text, p_details jsonb default '{}'::jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'not found' using errcode = 'P0002';
  end if;
  if coalesce((select auth.jwt()) ->> 'aal', 'aal1') <> 'aal2' then
    raise exception 'mfa required' using errcode = '42501';
  end if;
  insert into private.platform_audit (actor_id, action, details) values ((select auth.uid()), p_action, p_details);
end;
$$;

-- ---------------------------------------------------------------------------
-- Funções do painel (somente agregados e cadastros — nada de dado corporal sensível)
-- ---------------------------------------------------------------------------
create or replace function public.admin_overview()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v jsonb;
begin
  perform private.assert_platform_admin('overview');
  select jsonb_build_object(
    'users_total', (select count(*) from auth.users),
    'users_7d', (select count(*) from auth.users where created_at > now() - interval '7 days'),
    'users_30d', (select count(*) from auth.users where created_at > now() - interval '30 days'),
    'onboarded', (select count(*) from public.profiles where onboarding_completed_at is not null),
    'students', (select count(*) from public.students),
    'trainers', (select count(*) from public.trainers),
    'gyms', (select count(*) from public.gyms),
    'assessments', (select count(*) from public.physical_assessments),
    'sessions_30d', (select count(*) from public.workout_sessions where status = 'completed' and started_at > now() - interval '30 days'),
    'pending_requests', (select count(*) from public.data_requests where status = 'pending'),
    'signups_by_day', (
      select coalesce(jsonb_agg(jsonb_build_object('day', d::date, 'count', c) order by d), '[]'::jsonb)
      from (
        select g.d, (select count(*) from auth.users u where u.created_at::date = g.d::date) as c
        from generate_series(current_date - 29, current_date, interval '1 day') as g(d)
      ) s
    )
  ) into v;
  return v;
end;
$$;

create or replace function public.admin_list_users(p_search text default null, p_limit int default 50)
returns table (
  id uuid,
  email text,
  full_name text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  onboarded boolean,
  is_student boolean,
  is_trainer boolean,
  gyms_admin int
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.assert_platform_admin('list_users', jsonb_build_object('search', p_search));
  return query
  select u.id, u.email::text, p.full_name, u.created_at, u.last_sign_in_at,
         p.onboarding_completed_at is not null,
         exists (select 1 from public.students s where s.user_id = u.id),
         exists (select 1 from public.trainers t where t.user_id = u.id),
         (select count(*)::int from public.gym_members m where m.user_id = u.id and m.role = 'admin')
  from auth.users u
  left join public.profiles p on p.id = u.id
  where p_search is null or p_search = ''
     or u.email ilike '%' || p_search || '%'
     or p.full_name ilike '%' || p_search || '%'
  order by u.created_at desc
  limit least(greatest(p_limit, 1), 200);
end;
$$;

create or replace function public.admin_list_data_requests()
returns table (id uuid, user_id uuid, email text, kind text, status text, reason text, created_at timestamptz, processed_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.assert_platform_admin('list_data_requests');
  return query
  select r.id, r.user_id, u.email::text, r.kind, r.status, r.reason, r.created_at, r.processed_at
  from public.data_requests r
  left join auth.users u on u.id = r.user_id
  order by (r.status = 'pending') desc, r.created_at desc
  limit 200;
end;
$$;

create or replace function public.admin_set_data_request_status(p_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_status not in ('processing', 'done', 'rejected') then
    raise exception 'status inválido' using errcode = '22023';
  end if;
  perform private.assert_platform_admin('set_data_request_status', jsonb_build_object('id', p_id, 'status', p_status));
  update public.data_requests
     set status = p_status,
         processed_at = case when p_status in ('done', 'rejected') then now() else processed_at end
   where id = p_id;
end;
$$;

create or replace function public.admin_recent_audit()
returns table (action text, details jsonb, created_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.assert_platform_admin('view_audit');
  return query select a.action, a.details, a.created_at from private.platform_audit a order by a.created_at desc limit 50;
end;
$$;

revoke execute on function public.admin_overview() from public, anon;
revoke execute on function public.admin_list_users(text, int) from public, anon;
revoke execute on function public.admin_list_data_requests() from public, anon;
revoke execute on function public.admin_set_data_request_status(uuid, text) from public, anon;
revoke execute on function public.admin_recent_audit() from public, anon;
revoke execute on function public.is_platform_admin() from public, anon;
grant execute on function public.admin_overview() to authenticated;
grant execute on function public.admin_list_users(text, int) to authenticated;
grant execute on function public.admin_list_data_requests() to authenticated;
grant execute on function public.admin_set_data_request_status(uuid, text) to authenticated;
grant execute on function public.admin_recent_audit() to authenticated;
grant execute on function public.is_platform_admin() to authenticated;
