-- FITCORE AI — regras de acesso (Row Level Security)
--
-- Princípios:
--   * Aluno vê e altera somente os próprios dados.
--   * Personal vê apenas alunos vinculados a ele (trainer_students).
--   * Administrador só enxerga a própria academia.
--   * Fotos corporais: somente o próprio aluno e o personal vinculado (nem o admin vê).
--   * Conversas com a IA: somente o próprio usuário.

-- ---------------------------------------------------------------------------
-- Funções auxiliares (security definer evita recursão entre políticas)
-- ---------------------------------------------------------------------------
create or replace function public.is_gym_member(p_gym uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.gym_members m
    where m.gym_id = p_gym and m.user_id = (select auth.uid()) and m.status = 'active'
  );
$$;

create or replace function public.is_gym_admin(p_gym uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.gym_members m
    where m.gym_id = p_gym and m.user_id = (select auth.uid()) and m.role = 'admin' and m.status = 'active'
  );
$$;

create or replace function public.my_student_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select s.id from public.students s where s.user_id = (select auth.uid());
$$;

create or replace function public.my_trainer_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select t.id from public.trainers t where t.user_id = (select auth.uid());
$$;

create or replace function public.is_trainer_of(p_student uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.trainer_students ts
    join public.trainers t on t.id = ts.trainer_id
    where ts.student_id = p_student and t.user_id = (select auth.uid())
  );
$$;

create or replace function public.is_admin_of_student(p_student uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.students s
    join public.gym_members m on m.gym_id = s.gym_id
    where s.id = p_student
      and m.user_id = (select auth.uid())
      and m.role = 'admin'
      and m.status = 'active'
  );
$$;

-- Quem pode LER os dados de um aluno.
create or replace function public.can_view_student(p_student uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.students s where s.id = p_student and s.user_id = (select auth.uid()))
      or public.is_trainer_of(p_student)
      or public.is_admin_of_student(p_student);
$$;

-- Quem pode GERENCIAR (criar treinos, metas, observações) para um aluno.
create or replace function public.can_manage_student(p_student uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_trainer_of(p_student) or public.is_admin_of_student(p_student);
$$;

-- Fotos corporais: mais restrito que os demais dados.
create or replace function public.can_view_student_photos(p_student uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.students s where s.id = p_student and s.user_id = (select auth.uid()))
      or public.is_trainer_of(p_student);
$$;

create or replace function public.can_view_profile(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_user = (select auth.uid())
      -- profissional/admin que pode ver o aluno
      or exists (select 1 from public.students s where s.user_id = p_user and public.can_view_student(s.id))
      -- aluno vê o perfil do seu personal
      or exists (
        select 1 from public.trainer_students ts
        join public.trainers t on t.id = ts.trainer_id
        where t.user_id = p_user and ts.student_id = public.my_student_id()
      )
      -- admin vê quem faz parte da sua academia
      or exists (
        select 1 from public.gym_members m
        where m.user_id = p_user and public.is_gym_admin(m.gym_id)
      );
$$;

revoke execute on all functions in schema public from anon;

-- ---------------------------------------------------------------------------
-- Ativar RLS em todas as tabelas
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.consent_records enable row level security;
alter table public.data_requests enable row level security;
alter table public.gyms enable row level security;
alter table public.gym_members enable row level security;
alter table public.trainers enable row level security;
alter table public.students enable row level security;
alter table public.trainer_students enable row level security;
alter table public.student_notes enable row level security;
alter table public.physical_assessments enable row level security;
alter table public.body_measurements enable row level security;
alter table public.body_photos enable row level security;
alter table public.body_analysis_reports enable row level security;
alter table public.muscle_groups enable row level security;
alter table public.exercises enable row level security;
alter table public.workout_plans enable row level security;
alter table public.workout_exercises enable row level security;
alter table public.workout_sessions enable row level security;
alter table public.workout_logs enable row level security;
alter table public.food_items enable row level security;
alter table public.nutrition_plans enable row level security;
alter table public.meals enable row level security;
alter table public.meal_items enable row level security;
alter table public.nutrition_logs enable row level security;
alter table public.goals enable row level security;
alter table public.achievements enable row level security;
alter table public.notifications enable row level security;
alter table public.gym_plans enable row level security;
alter table public.subscriptions enable row level security;
alter table public.subscription_payments enable row level security;
alter table public.ai_conversations enable row level security;
alter table public.ai_messages enable row level security;
alter table public.audit_logs enable row level security;

-- Visitantes sem login não acessam nada.
revoke all on all tables in schema public from anon;

-- ---------------------------------------------------------------------------
-- Perfis, consentimentos e LGPD
-- ---------------------------------------------------------------------------
create policy profiles_select on public.profiles for select to authenticated
  using (public.can_view_profile(id));
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy consent_select_own on public.consent_records for select to authenticated
  using (user_id = (select auth.uid()));
create policy consent_insert_own on public.consent_records for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy data_requests_select_own on public.data_requests for select to authenticated
  using (user_id = (select auth.uid()));
create policy data_requests_insert_own on public.data_requests for insert to authenticated
  with check (user_id = (select auth.uid()) and status = 'pending');

-- ---------------------------------------------------------------------------
-- Academias e membros
-- ---------------------------------------------------------------------------
create policy gyms_select on public.gyms for select to authenticated
  using (public.is_gym_member(id) or created_by = (select auth.uid()));
create policy gyms_insert on public.gyms for insert to authenticated
  with check (created_by = (select auth.uid()));
create policy gyms_update on public.gyms for update to authenticated
  using (public.is_gym_admin(id)) with check (public.is_gym_admin(id));
create policy gyms_delete on public.gyms for delete to authenticated
  using (public.is_gym_admin(id));

-- Quem cria a academia vira administrador automaticamente.
create or replace function public.handle_new_gym()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.created_by is not null then
    insert into public.gym_members (gym_id, user_id, role)
    values (new.id, new.created_by, 'admin')
    on conflict do nothing;
  end if;
  return new;
end;
$$;
create trigger on_gym_created after insert on public.gyms
  for each row execute function public.handle_new_gym();

create policy gym_members_select on public.gym_members for select to authenticated
  using (user_id = (select auth.uid()) or public.is_gym_admin(gym_id));
create policy gym_members_insert on public.gym_members for insert to authenticated
  with check (public.is_gym_admin(gym_id));
create policy gym_members_update on public.gym_members for update to authenticated
  using (public.is_gym_admin(gym_id)) with check (public.is_gym_admin(gym_id));
create policy gym_members_delete on public.gym_members for delete to authenticated
  using (public.is_gym_admin(gym_id) and user_id <> (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Profissionais e alunos
-- ---------------------------------------------------------------------------
create policy trainers_select on public.trainers for select to authenticated
  using (
    user_id = (select auth.uid())
    or (gym_id is not null and public.is_gym_admin(gym_id))
    or exists (select 1 from public.trainer_students ts where ts.trainer_id = trainers.id and ts.student_id = public.my_student_id())
  );
create policy trainers_insert on public.trainers for insert to authenticated
  with check (
    (user_id = (select auth.uid()) and gym_id is null)
    or (gym_id is not null and public.is_gym_admin(gym_id))
  );
create policy trainers_update on public.trainers for update to authenticated
  using (user_id = (select auth.uid()) or (gym_id is not null and public.is_gym_admin(gym_id)))
  with check (
    (user_id = (select auth.uid()) and (gym_id is null or public.is_gym_member(gym_id)))
    or (gym_id is not null and public.is_gym_admin(gym_id))
  );

create policy students_select on public.students for select to authenticated
  using (public.can_view_student(id));
-- O próprio usuário cria seu cadastro de aluno (sem academia); o admin cria na sua academia.
create policy students_insert on public.students for insert to authenticated
  with check (
    (user_id = (select auth.uid()) and gym_id is null)
    or (gym_id is not null and public.is_gym_admin(gym_id))
  );
create policy students_update on public.students for update to authenticated
  using (gym_id is not null and public.is_gym_admin(gym_id))
  with check (gym_id is not null and public.is_gym_admin(gym_id));
create policy students_delete on public.students for delete to authenticated
  using (gym_id is not null and public.is_gym_admin(gym_id));

create policy trainer_students_select on public.trainer_students for select to authenticated
  using (
    trainer_id = public.my_trainer_id()
    or student_id = public.my_student_id()
    or public.is_admin_of_student(student_id)
  );
create policy trainer_students_insert on public.trainer_students for insert to authenticated
  with check (
    public.is_admin_of_student(student_id)
    and exists (
      select 1 from public.trainers t
      join public.students s on s.id = trainer_students.student_id
      where t.id = trainer_students.trainer_id and t.gym_id = s.gym_id
    )
  );
create policy trainer_students_delete on public.trainer_students for delete to authenticated
  using (public.is_admin_of_student(student_id));

create policy student_notes_select on public.student_notes for select to authenticated
  using (
    public.can_manage_student(student_id)
    or (visible_to_student and student_id = public.my_student_id())
  );
create policy student_notes_insert on public.student_notes for insert to authenticated
  with check (author_id = (select auth.uid()) and public.can_manage_student(student_id));
create policy student_notes_update on public.student_notes for update to authenticated
  using (author_id = (select auth.uid())) with check (author_id = (select auth.uid()) and public.can_manage_student(student_id));
create policy student_notes_delete on public.student_notes for delete to authenticated
  using (author_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Avaliação física
-- ---------------------------------------------------------------------------
create policy assessments_select on public.physical_assessments for select to authenticated
  using (public.can_view_student(student_id));
create policy assessments_insert on public.physical_assessments for insert to authenticated
  with check (student_id = public.my_student_id() or public.can_manage_student(student_id));
create policy assessments_update on public.physical_assessments for update to authenticated
  using (student_id = public.my_student_id() or public.can_manage_student(student_id))
  with check (student_id = public.my_student_id() or public.can_manage_student(student_id));
create policy assessments_delete on public.physical_assessments for delete to authenticated
  using (student_id = public.my_student_id() or public.can_manage_student(student_id));

create policy measurements_select on public.body_measurements for select to authenticated
  using (public.can_view_student(student_id));
create policy measurements_insert on public.body_measurements for insert to authenticated
  with check (student_id = public.my_student_id() or public.can_manage_student(student_id));
create policy measurements_update on public.body_measurements for update to authenticated
  using (student_id = public.my_student_id() or public.can_manage_student(student_id))
  with check (student_id = public.my_student_id() or public.can_manage_student(student_id));
create policy measurements_delete on public.body_measurements for delete to authenticated
  using (student_id = public.my_student_id() or public.can_manage_student(student_id));

create policy photos_select on public.body_photos for select to authenticated
  using (public.can_view_student_photos(student_id));
create policy photos_insert on public.body_photos for insert to authenticated
  with check (student_id = public.my_student_id());
create policy photos_delete on public.body_photos for delete to authenticated
  using (student_id = public.my_student_id());

create policy reports_select on public.body_analysis_reports for select to authenticated
  using (public.can_view_student(student_id));
create policy reports_insert on public.body_analysis_reports for insert to authenticated
  with check (student_id = public.my_student_id() or public.can_manage_student(student_id));
create policy reports_delete on public.body_analysis_reports for delete to authenticated
  using (student_id = public.my_student_id());

-- ---------------------------------------------------------------------------
-- Catálogos (grupos musculares, exercícios, alimentos)
-- ---------------------------------------------------------------------------
create policy muscle_groups_select on public.muscle_groups for select to authenticated using (true);

create policy exercises_select on public.exercises for select to authenticated
  using ((gym_id is null and created_by is null) or created_by = (select auth.uid()) or (gym_id is not null and public.is_gym_member(gym_id)));
create policy exercises_insert on public.exercises for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and (gym_id is null or public.is_gym_admin(gym_id) or exists (
      select 1 from public.gym_members m where m.gym_id = exercises.gym_id and m.user_id = (select auth.uid()) and m.role = 'trainer' and m.status = 'active'
    ))
  );
create policy exercises_update on public.exercises for update to authenticated
  using (created_by = (select auth.uid()) or (gym_id is not null and public.is_gym_admin(gym_id)))
  with check (created_by = (select auth.uid()) or (gym_id is not null and public.is_gym_admin(gym_id)));
create policy exercises_delete on public.exercises for delete to authenticated
  using (created_by = (select auth.uid()) or (gym_id is not null and public.is_gym_admin(gym_id)));

create policy food_items_select on public.food_items for select to authenticated
  using ((gym_id is null and created_by is null) or created_by = (select auth.uid()) or (gym_id is not null and public.is_gym_member(gym_id)));
create policy food_items_insert on public.food_items for insert to authenticated
  with check (created_by = (select auth.uid()) and (gym_id is null or public.is_gym_admin(gym_id)));
create policy food_items_update on public.food_items for update to authenticated
  using (created_by = (select auth.uid())) with check (created_by = (select auth.uid()));
create policy food_items_delete on public.food_items for delete to authenticated
  using (created_by = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Treinos
-- ---------------------------------------------------------------------------
create policy workout_plans_select on public.workout_plans for select to authenticated
  using (public.can_view_student(student_id));
create policy workout_plans_write on public.workout_plans for insert to authenticated
  with check (student_id = public.my_student_id() or public.can_manage_student(student_id));
create policy workout_plans_update on public.workout_plans for update to authenticated
  using (student_id = public.my_student_id() or public.can_manage_student(student_id))
  with check (student_id = public.my_student_id() or public.can_manage_student(student_id));
create policy workout_plans_delete on public.workout_plans for delete to authenticated
  using (student_id = public.my_student_id() or public.can_manage_student(student_id));

create policy workout_exercises_select on public.workout_exercises for select to authenticated
  using (exists (select 1 from public.workout_plans p where p.id = plan_id and public.can_view_student(p.student_id)));
create policy workout_exercises_insert on public.workout_exercises for insert to authenticated
  with check (exists (select 1 from public.workout_plans p where p.id = plan_id and (p.student_id = public.my_student_id() or public.can_manage_student(p.student_id))));
create policy workout_exercises_update on public.workout_exercises for update to authenticated
  using (exists (select 1 from public.workout_plans p where p.id = plan_id and (p.student_id = public.my_student_id() or public.can_manage_student(p.student_id))))
  with check (exists (select 1 from public.workout_plans p where p.id = plan_id and (p.student_id = public.my_student_id() or public.can_manage_student(p.student_id))));
create policy workout_exercises_delete on public.workout_exercises for delete to authenticated
  using (exists (select 1 from public.workout_plans p where p.id = plan_id and (p.student_id = public.my_student_id() or public.can_manage_student(p.student_id))));

-- Sessões e séries são registradas somente pelo próprio aluno.
create policy sessions_select on public.workout_sessions for select to authenticated
  using (public.can_view_student(student_id));
create policy sessions_insert on public.workout_sessions for insert to authenticated
  with check (student_id = public.my_student_id());
create policy sessions_update on public.workout_sessions for update to authenticated
  using (student_id = public.my_student_id()) with check (student_id = public.my_student_id());
create policy sessions_delete on public.workout_sessions for delete to authenticated
  using (student_id = public.my_student_id());

create policy logs_select on public.workout_logs for select to authenticated
  using (public.can_view_student(student_id));
create policy logs_insert on public.workout_logs for insert to authenticated
  with check (student_id = public.my_student_id());
create policy logs_update on public.workout_logs for update to authenticated
  using (student_id = public.my_student_id()) with check (student_id = public.my_student_id());
create policy logs_delete on public.workout_logs for delete to authenticated
  using (student_id = public.my_student_id());

-- ---------------------------------------------------------------------------
-- Nutrição
-- ---------------------------------------------------------------------------
create policy nutrition_plans_select on public.nutrition_plans for select to authenticated
  using (public.can_view_student(student_id));
create policy nutrition_plans_insert on public.nutrition_plans for insert to authenticated
  with check (student_id = public.my_student_id() or public.can_manage_student(student_id));
create policy nutrition_plans_update on public.nutrition_plans for update to authenticated
  using (student_id = public.my_student_id() or public.can_manage_student(student_id))
  with check (student_id = public.my_student_id() or public.can_manage_student(student_id));
create policy nutrition_plans_delete on public.nutrition_plans for delete to authenticated
  using (student_id = public.my_student_id() or public.can_manage_student(student_id));

create policy meals_select on public.meals for select to authenticated
  using (exists (select 1 from public.nutrition_plans p where p.id = plan_id and public.can_view_student(p.student_id)));
create policy meals_write on public.meals for all to authenticated
  using (exists (select 1 from public.nutrition_plans p where p.id = plan_id and (p.student_id = public.my_student_id() or public.can_manage_student(p.student_id))))
  with check (exists (select 1 from public.nutrition_plans p where p.id = plan_id and (p.student_id = public.my_student_id() or public.can_manage_student(p.student_id))));

create policy meal_items_select on public.meal_items for select to authenticated
  using (exists (
    select 1 from public.meals m join public.nutrition_plans p on p.id = m.plan_id
    where m.id = meal_id and public.can_view_student(p.student_id)
  ));
create policy meal_items_write on public.meal_items for all to authenticated
  using (exists (
    select 1 from public.meals m join public.nutrition_plans p on p.id = m.plan_id
    where m.id = meal_id and (p.student_id = public.my_student_id() or public.can_manage_student(p.student_id))
  ))
  with check (exists (
    select 1 from public.meals m join public.nutrition_plans p on p.id = m.plan_id
    where m.id = meal_id and (p.student_id = public.my_student_id() or public.can_manage_student(p.student_id))
  ));

create policy nutrition_logs_select on public.nutrition_logs for select to authenticated
  using (public.can_view_student(student_id));
create policy nutrition_logs_insert on public.nutrition_logs for insert to authenticated
  with check (student_id = public.my_student_id());
create policy nutrition_logs_update on public.nutrition_logs for update to authenticated
  using (student_id = public.my_student_id()) with check (student_id = public.my_student_id());
create policy nutrition_logs_delete on public.nutrition_logs for delete to authenticated
  using (student_id = public.my_student_id());

-- ---------------------------------------------------------------------------
-- Metas, conquistas e notificações
-- ---------------------------------------------------------------------------
create policy goals_select on public.goals for select to authenticated
  using (public.can_view_student(student_id));
create policy goals_insert on public.goals for insert to authenticated
  with check (student_id = public.my_student_id() or public.can_manage_student(student_id));
create policy goals_update on public.goals for update to authenticated
  using (student_id = public.my_student_id() or public.can_manage_student(student_id))
  with check (student_id = public.my_student_id() or public.can_manage_student(student_id));
create policy goals_delete on public.goals for delete to authenticated
  using (student_id = public.my_student_id() or public.can_manage_student(student_id));

-- Conquistas são concedidas apenas pelo servidor (funções security definer).
create policy achievements_select on public.achievements for select to authenticated
  using (public.can_view_student(student_id));

create policy notifications_select_own on public.notifications for select to authenticated
  using (user_id = (select auth.uid()));
create policy notifications_update_own on public.notifications for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy notifications_delete_own on public.notifications for delete to authenticated
  using (user_id = (select auth.uid()));
create policy notifications_insert on public.notifications for insert to authenticated
  with check (
    user_id = (select auth.uid())
    or exists (select 1 from public.students s where s.user_id = notifications.user_id and public.can_manage_student(s.id))
  );

-- ---------------------------------------------------------------------------
-- Planos e financeiro (somente admin da academia; aluno vê o que é dele)
-- ---------------------------------------------------------------------------
create policy gym_plans_select on public.gym_plans for select to authenticated
  using (public.is_gym_member(gym_id));
create policy gym_plans_write on public.gym_plans for all to authenticated
  using (public.is_gym_admin(gym_id)) with check (public.is_gym_admin(gym_id));

create policy subscriptions_select on public.subscriptions for select to authenticated
  using (public.is_gym_admin(gym_id) or student_id = public.my_student_id());
create policy subscriptions_write on public.subscriptions for all to authenticated
  using (public.is_gym_admin(gym_id))
  with check (
    public.is_gym_admin(gym_id)
    and exists (select 1 from public.students s where s.id = student_id and s.gym_id = subscriptions.gym_id)
  );

create policy payments_select on public.subscription_payments for select to authenticated
  using (
    public.is_gym_admin(gym_id)
    or exists (select 1 from public.subscriptions s where s.id = subscription_id and s.student_id = public.my_student_id())
  );
create policy payments_write on public.subscription_payments for all to authenticated
  using (public.is_gym_admin(gym_id))
  with check (
    public.is_gym_admin(gym_id)
    and exists (select 1 from public.subscriptions s where s.id = subscription_id and s.gym_id = subscription_payments.gym_id)
  );

-- ---------------------------------------------------------------------------
-- IA (privado ao usuário)
-- ---------------------------------------------------------------------------
create policy ai_conversations_own on public.ai_conversations for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and (student_id is null or public.can_view_student(student_id)));

create policy ai_messages_select on public.ai_messages for select to authenticated
  using (exists (select 1 from public.ai_conversations c where c.id = conversation_id and c.user_id = (select auth.uid())));
create policy ai_messages_insert on public.ai_messages for insert to authenticated
  with check (exists (select 1 from public.ai_conversations c where c.id = conversation_id and c.user_id = (select auth.uid())));

-- ---------------------------------------------------------------------------
-- Auditoria: leitura pelo admin; escrita apenas por gatilhos
-- ---------------------------------------------------------------------------
create policy audit_select on public.audit_logs for select to authenticated
  using (gym_id is not null and public.is_gym_admin(gym_id));

create or replace function public.audit_admin_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row jsonb := to_jsonb(coalesce(new, old));
  v_gym uuid;
begin
  v_gym := nullif(v_row ->> 'gym_id', '')::uuid;
  if v_gym is null and v_row ? 'student_id' then
    select s.gym_id into v_gym from public.students s where s.id = (v_row ->> 'student_id')::uuid;
  end if;
  insert into public.audit_logs (gym_id, actor_id, action, table_name, record_id, details)
  values (
    v_gym,
    (select auth.uid()),
    lower(tg_op),
    tg_table_name,
    coalesce(v_row ->> 'id', concat_ws(':', v_row ->> 'trainer_id', v_row ->> 'student_id')),
    case when tg_op = 'UPDATE' then jsonb_build_object('before', to_jsonb(old), 'after', to_jsonb(new)) else v_row end
  );
  return coalesce(new, old);
end;
$$;

create trigger audit_gym_members after insert or update or delete on public.gym_members
  for each row execute function public.audit_admin_change();
create trigger audit_students after insert or update or delete on public.students
  for each row execute function public.audit_admin_change();
create trigger audit_trainers after insert or update or delete on public.trainers
  for each row execute function public.audit_admin_change();
create trigger audit_trainer_students after insert or delete on public.trainer_students
  for each row execute function public.audit_admin_change();
create trigger audit_gym_plans after insert or update or delete on public.gym_plans
  for each row execute function public.audit_admin_change();
create trigger audit_subscriptions after insert or update or delete on public.subscriptions
  for each row execute function public.audit_admin_change();
create trigger audit_payments after insert or update or delete on public.subscription_payments
  for each row execute function public.audit_admin_change();
