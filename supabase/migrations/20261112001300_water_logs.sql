-- Registro de água (hidratação) feito pelo próprio aluno.
create table if not exists public.water_logs (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  amount_ml int not null check (amount_ml between 50 and 2000),
  logged_at timestamptz not null default now()
);
create index if not exists water_logs_student_idx on public.water_logs (student_id, logged_at desc);

alter table public.water_logs enable row level security;

drop policy if exists water_select on public.water_logs;
drop policy if exists water_insert on public.water_logs;
drop policy if exists water_delete on public.water_logs;
create policy water_select on public.water_logs for select to authenticated
  using (public.can_view_student(student_id));
create policy water_insert on public.water_logs for insert to authenticated
  with check (student_id = public.my_student_id());
create policy water_delete on public.water_logs for delete to authenticated
  using (student_id = public.my_student_id());

grant select, insert, delete on public.water_logs to authenticated;

-- Meta diária de água escolhida pela pessoa (opcional; sem ela o app usa 35 ml por kg ou 2,5 L).
alter table public.profiles add column if not exists water_goal_ml int check (water_goal_ml is null or water_goal_ml between 500 and 8000);
