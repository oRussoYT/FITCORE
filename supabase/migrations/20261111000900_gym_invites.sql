-- Convites da academia para alunos e personal trainers.
-- A academia só passa a ver os dados de alguém depois que a própria pessoa ACEITA o convite.

create table public.gym_invites (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms (id) on delete cascade,
  email text not null check (email = lower(email) and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  role public.member_role not null check (role in ('student', 'trainer')),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'revoked')),
  invited_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  responded_at timestamptz
);
create unique index gym_invites_pending_idx on public.gym_invites (gym_id, email, role) where status = 'pending';
create index gym_invites_email_idx on public.gym_invites (email) where status = 'pending';

alter table public.gym_invites enable row level security;
grant select, insert, update, delete on public.gym_invites to authenticated;

create or replace function public.my_email()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select lower(u.email) from auth.users u where u.id = (select auth.uid()) and u.email_confirmed_at is not null;
$$;

create policy gym_invites_admin on public.gym_invites for all to authenticated
  using (public.is_gym_admin(gym_id))
  with check (public.is_gym_admin(gym_id) and status in ('pending', 'revoked'));
create policy gym_invites_invitee on public.gym_invites for select to authenticated
  using (email = public.my_email());

-- Convidado vê o nome da academia que o convidou.
create policy gyms_select_invited on public.gyms for select to authenticated
  using (exists (select 1 from public.gym_invites i where i.gym_id = gyms.id and i.email = public.my_email() and i.status = 'pending'));

create trigger audit_gym_invites after insert or update or delete on public.gym_invites
  for each row execute function public.audit_admin_change();

-- Aceitar ou recusar um convite (somente o próprio convidado).
create or replace function public.respond_gym_invite(p_invite uuid, p_accept boolean)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_inv public.gym_invites%rowtype;
  v_uid uuid := (select auth.uid());
  v_student public.students%rowtype;
begin
  select * into v_inv from public.gym_invites
   where id = p_invite and status = 'pending' and email = public.my_email()
   for update;
  if not found then
    raise exception 'convite não encontrado' using errcode = 'P0002';
  end if;

  if not p_accept then
    update public.gym_invites set status = 'declined', responded_at = now() where id = v_inv.id;
    return 'declined';
  end if;

  insert into public.gym_members (gym_id, user_id, role, status)
  values (v_inv.gym_id, v_uid, v_inv.role, 'active')
  on conflict (gym_id, user_id, role) do update set status = 'active';

  if v_inv.role = 'student' then
    select * into v_student from public.students where user_id = v_uid;
    if not found then
      insert into public.students (user_id, gym_id) values (v_uid, v_inv.gym_id);
    elsif v_student.gym_id is null or v_student.gym_id = v_inv.gym_id then
      update public.students set gym_id = v_inv.gym_id, status = 'active' where id = v_student.id;
    else
      raise exception 'você já está vinculado a outra academia' using errcode = '23505';
    end if;
  else
    insert into public.trainers (user_id, gym_id) values (v_uid, v_inv.gym_id)
    on conflict (user_id) do update set gym_id = coalesce(public.trainers.gym_id, excluded.gym_id);
  end if;

  update public.gym_invites set status = 'accepted', responded_at = now() where id = v_inv.id;
  return 'accepted';
end;
$$;

revoke execute on function public.respond_gym_invite(uuid, boolean) from public, anon;
grant execute on function public.respond_gym_invite(uuid, boolean) to authenticated;
revoke execute on function public.my_email() from public, anon;
grant execute on function public.my_email() to authenticated;

-- O personal pode criar notificações para seus alunos (já permitido) e ver o perfil deles (já permitido).
-- O personal precisa enxergar os exercícios da academia ao montar treinos: já coberto por is_gym_member.
