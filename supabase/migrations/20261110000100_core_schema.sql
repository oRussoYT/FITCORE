-- FITCORE AI — esquema principal
-- Observação: a tabela "users" do projeto é a auth.users do Supabase Auth.
-- Os dados de perfil ficam em public.profiles (1:1 com auth.users).

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------------
create type public.member_role as enum ('admin', 'trainer', 'student');
create type public.member_status as enum ('active', 'inactive');
create type public.sex_type as enum ('male', 'female');
create type public.measurement_site as enum ('arm', 'forearm', 'chest', 'waist', 'abdomen', 'hip', 'thigh', 'calf');
create type public.body_side as enum ('left', 'right', 'center');
create type public.assessment_source as enum ('self', 'professional', 'import');
create type public.photo_pose as enum ('front', 'back', 'left', 'right');
create type public.meal_slot as enum ('breakfast', 'morning_snack', 'lunch', 'afternoon_snack', 'dinner', 'supper');
create type public.session_status as enum ('in_progress', 'paused', 'completed', 'abandoned');
create type public.goal_status as enum ('active', 'completed', 'abandoned');
create type public.subscription_status as enum ('active', 'past_due', 'canceled');

-- ---------------------------------------------------------------------------
-- Utilidades
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Perfis
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text check (char_length(full_name) <= 120),
  avatar_path text,
  birth_date date check (birth_date > date '1900-01-01'),
  sex public.sex_type,
  height_cm numeric(5, 1) check (height_cm between 80 and 260),
  primary_goal text check (primary_goal in ('lose_fat', 'gain_muscle', 'recomposition', 'performance', 'health', 'maintain')),
  experience_level text check (experience_level in ('beginner', 'intermediate', 'advanced')),
  weekly_availability smallint check (weekly_availability between 0 and 7),
  session_minutes smallint check (session_minutes between 10 and 300),
  food_preferences jsonb not null default '{}'::jsonb,
  onboarding_step smallint not null default 0 check (onboarding_step between 0 and 7),
  onboarding_completed_at timestamptz,
  consent_health_data_at timestamptz,
  consent_photos_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, nullif(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'), ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create table public.consent_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  consent_type text not null check (consent_type in ('health_data', 'body_photos', 'ai_analysis', 'terms')),
  granted boolean not null,
  version text not null default '2026-11',
  created_at timestamptz not null default now()
);
create index consent_records_user_idx on public.consent_records (user_id, consent_type, created_at desc);

create table public.data_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('export', 'delete')),
  status text not null default 'pending' check (status in ('pending', 'processing', 'done', 'rejected')),
  reason text,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);
create index data_requests_user_idx on public.data_requests (user_id);

-- ---------------------------------------------------------------------------
-- Academias, profissionais e alunos
-- ---------------------------------------------------------------------------
create table public.gyms (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,60}$'),
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

create table public.gym_members (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.member_role not null,
  status public.member_status not null default 'active',
  created_at timestamptz not null default now(),
  unique (gym_id, user_id, role)
);
create index gym_members_user_idx on public.gym_members (user_id);
create index gym_members_gym_role_idx on public.gym_members (gym_id, role, status);

create table public.trainers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  gym_id uuid references public.gyms (id) on delete set null,
  bio text,
  specialties text[] not null default '{}',
  professional_registry text,
  created_at timestamptz not null default now()
);
create index trainers_gym_idx on public.trainers (gym_id);

create table public.students (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  gym_id uuid references public.gyms (id) on delete set null,
  status public.member_status not null default 'active',
  created_at timestamptz not null default now()
);
create index students_gym_idx on public.students (gym_id, status);

create table public.trainer_students (
  trainer_id uuid not null references public.trainers (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (trainer_id, student_id)
);
create index trainer_students_student_idx on public.trainer_students (student_id);

create table public.student_notes (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  author_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  body text not null check (char_length(body) between 1 and 4000),
  visible_to_student boolean not null default true,
  created_at timestamptz not null default now()
);
create index student_notes_student_idx on public.student_notes (student_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Avaliação física
-- ---------------------------------------------------------------------------
create table public.physical_assessments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  assessed_at timestamptz not null default now(),
  source public.assessment_source not null default 'self',
  recorded_by uuid references auth.users (id) on delete set null default auth.uid(),
  weight_kg numeric(5, 2) check (weight_kg between 20 and 400),
  height_cm numeric(5, 1) check (height_cm between 80 and 260),
  age_years smallint check (age_years between 10 and 120),
  sex public.sex_type,
  body_fat_pct numeric(4, 1) check (body_fat_pct between 2 and 70),
  body_fat_method text check (char_length(body_fat_method) <= 80),
  muscle_mass_kg numeric(5, 2) check (muscle_mass_kg between 5 and 150),
  muscle_mass_method text check (char_length(muscle_mass_method) <= 80),
  notes text check (char_length(notes) <= 4000),
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  -- Percentual de gordura e massa muscular só são aceitos com o método informado.
  constraint body_fat_requires_method check (body_fat_pct is null or body_fat_method is not null),
  constraint muscle_requires_method check (muscle_mass_kg is null or muscle_mass_method is not null)
);
create index physical_assessments_student_idx on public.physical_assessments (student_id, assessed_at desc);

create table public.body_measurements (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.physical_assessments (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  site public.measurement_site not null,
  side public.body_side not null default 'center',
  value_cm numeric(5, 1) not null check (value_cm between 5 and 300),
  unique (assessment_id, site, side)
);
create index body_measurements_student_idx on public.body_measurements (student_id, site);

-- O aluno da medida é sempre o mesmo da avaliação (não confiamos no cliente).
create or replace function public.set_measurement_student()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  select a.student_id into new.student_id
  from public.physical_assessments a
  where a.id = new.assessment_id;
  return new;
end;
$$;

create trigger body_measurements_student before insert or update on public.body_measurements
  for each row execute function public.set_measurement_student();

create table public.body_photos (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  assessment_id uuid references public.physical_assessments (id) on delete set null,
  storage_path text not null unique,
  pose public.photo_pose not null,
  taken_at timestamptz not null default now(),
  consent_at timestamptz not null,
  uploaded_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);
create index body_photos_student_idx on public.body_photos (student_id, taken_at desc);

create table public.body_analysis_reports (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  assessment_id uuid references public.physical_assessments (id) on delete set null,
  kind text not null default 'assessment' check (kind in ('assessment', 'photo', 'weekly')),
  provider text,
  model text,
  content jsonb not null,
  input_snapshot jsonb,
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);
create index body_analysis_reports_student_idx on public.body_analysis_reports (student_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Treinos
-- ---------------------------------------------------------------------------
create table public.muscle_groups (
  slug text primary key,
  name text not null,
  region text not null check (region in ('upper', 'core', 'lower')),
  sort_order smallint not null
);

create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid references public.gyms (id) on delete cascade,
  name text not null check (char_length(name) between 2 and 120),
  primary_muscle text not null references public.muscle_groups (slug),
  secondary_muscles text[] not null default '{}',
  equipment text,
  media_url text,
  instructions text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index exercises_gym_idx on public.exercises (gym_id);
create index exercises_muscle_idx on public.exercises (primary_muscle);

create table public.workout_plans (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  label text not null check (label in ('A', 'B', 'C', 'D', 'E')),
  name text not null check (char_length(name) between 1 and 80),
  notes text,
  is_active boolean not null default true,
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index workout_plans_active_label_idx on public.workout_plans (student_id, label) where is_active;
create trigger workout_plans_updated_at before update on public.workout_plans
  for each row execute function public.set_updated_at();

create table public.workout_exercises (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.workout_plans (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete restrict,
  position smallint not null default 0,
  sets smallint not null check (sets between 1 and 20),
  reps text not null check (char_length(reps) between 1 and 20),
  rest_seconds smallint not null default 60 check (rest_seconds between 0 and 900),
  target_load_kg numeric(6, 2) check (target_load_kg >= 0),
  notes text
);
create index workout_exercises_plan_idx on public.workout_exercises (plan_id, position);

create table public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  plan_id uuid references public.workout_plans (id) on delete set null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  paused_seconds integer not null default 0 check (paused_seconds >= 0),
  status public.session_status not null default 'in_progress',
  notes text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  constraint session_dates check (finished_at is null or finished_at >= started_at)
);
create index workout_sessions_student_idx on public.workout_sessions (student_id, started_at desc);

create table public.workout_logs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.workout_sessions (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete restrict,
  workout_exercise_id uuid references public.workout_exercises (id) on delete set null,
  set_number smallint not null check (set_number between 1 and 50),
  reps smallint check (reps between 0 and 500),
  load_kg numeric(6, 2) check (load_kg >= 0),
  completed_at timestamptz not null default now()
);
create index workout_logs_session_idx on public.workout_logs (session_id);
create index workout_logs_student_exercise_idx on public.workout_logs (student_id, exercise_id, completed_at desc);

create or replace function public.set_log_student()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  select s.student_id into new.student_id
  from public.workout_sessions s
  where s.id = new.session_id;
  return new;
end;
$$;

create trigger workout_logs_student before insert or update on public.workout_logs
  for each row execute function public.set_log_student();

-- ---------------------------------------------------------------------------
-- Nutrição
-- ---------------------------------------------------------------------------
create table public.food_items (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid references public.gyms (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  serving_g numeric(7, 2) not null default 100 check (serving_g > 0),
  kcal numeric(7, 2) not null check (kcal >= 0),
  protein_g numeric(6, 2) not null default 0 check (protein_g >= 0),
  carbs_g numeric(6, 2) not null default 0 check (carbs_g >= 0),
  fat_g numeric(6, 2) not null default 0 check (fat_g >= 0),
  source text,
  created_by uuid references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index food_items_name_idx on public.food_items (lower(name));

create table public.nutrition_plans (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  name text not null,
  kcal_target integer check (kcal_target between 500 and 10000),
  protein_target_g integer check (protein_target_g between 0 and 600),
  carbs_target_g integer check (carbs_target_g between 0 and 1500),
  fat_target_g integer check (fat_target_g between 0 and 600),
  water_target_ml integer check (water_target_ml between 0 and 10000),
  notes text,
  is_active boolean not null default true,
  -- Plano individualizado só é "aprovado" quando um nutricionista habilitado o assina.
  approved_by_name text,
  approved_registry text,
  approved_at timestamptz,
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);
create index nutrition_plans_student_idx on public.nutrition_plans (student_id, is_active);

create table public.meals (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.nutrition_plans (id) on delete cascade,
  slot public.meal_slot not null,
  scheduled_time time,
  notes text,
  position smallint not null default 0
);
create index meals_plan_idx on public.meals (plan_id, position);

create table public.meal_items (
  id uuid primary key default gen_random_uuid(),
  meal_id uuid not null references public.meals (id) on delete cascade,
  food_item_id uuid references public.food_items (id) on delete set null,
  food_name text not null,
  quantity_g numeric(7, 2) not null check (quantity_g > 0),
  kcal numeric(7, 2) not null default 0,
  protein_g numeric(6, 2) not null default 0,
  carbs_g numeric(6, 2) not null default 0,
  fat_g numeric(6, 2) not null default 0
);
create index meal_items_meal_idx on public.meal_items (meal_id);

create table public.nutrition_logs (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  logged_on date not null default current_date,
  slot public.meal_slot,
  food_item_id uuid references public.food_items (id) on delete set null,
  food_name text,
  quantity_g numeric(7, 2) check (quantity_g > 0),
  kcal numeric(7, 2) not null default 0 check (kcal >= 0),
  protein_g numeric(6, 2) not null default 0 check (protein_g >= 0),
  carbs_g numeric(6, 2) not null default 0 check (carbs_g >= 0),
  fat_g numeric(6, 2) not null default 0 check (fat_g >= 0),
  water_ml integer not null default 0 check (water_ml between 0 and 10000),
  created_at timestamptz not null default now(),
  constraint log_has_content check (food_name is not null or water_ml > 0)
);
create index nutrition_logs_student_day_idx on public.nutrition_logs (student_id, logged_on desc);

-- ---------------------------------------------------------------------------
-- Metas, conquistas e notificações
-- ---------------------------------------------------------------------------
create table public.goals (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  kind text not null check (kind in ('frequency', 'load', 'weight', 'consistency', 'assessment', 'measurement', 'custom')),
  title text not null check (char_length(title) between 2 and 120),
  unit text,
  start_value numeric(8, 2),
  target_value numeric(8, 2),
  current_value numeric(8, 2),
  starts_on date not null default current_date,
  due_on date,
  status public.goal_status not null default 'active',
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create index goals_student_idx on public.goals (student_id, status);

create table public.achievements (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  code text not null,
  title text not null,
  description text,
  earned_at timestamptz not null default now(),
  unique (student_id, code)
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('training_reminder', 'assessment_due', 'workout_released', 'goal_reached', 'trainer_note', 'report_ready', 'system')),
  title text not null,
  body text,
  link text check (link is null or link like '/%'),
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);
create index notifications_unread_idx on public.notifications (user_id) where read_at is null;

-- ---------------------------------------------------------------------------
-- Planos e mensalidades da academia
-- ---------------------------------------------------------------------------
create table public.gym_plans (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms (id) on delete cascade,
  name text not null,
  price_cents integer not null check (price_cents >= 0),
  billing_interval text not null default 'monthly' check (billing_interval in ('monthly', 'quarterly', 'semiannual', 'yearly')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create index gym_plans_gym_idx on public.gym_plans (gym_id);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  gym_plan_id uuid references public.gym_plans (id) on delete set null,
  status public.subscription_status not null default 'active',
  price_cents integer not null check (price_cents >= 0),
  started_at date not null default current_date,
  current_period_end date,
  canceled_at timestamptz,
  created_at timestamptz not null default now()
);
create index subscriptions_gym_idx on public.subscriptions (gym_id, status);
create index subscriptions_student_idx on public.subscriptions (student_id);

create table public.subscription_payments (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.subscriptions (id) on delete cascade,
  gym_id uuid not null references public.gyms (id) on delete cascade,
  amount_cents integer not null check (amount_cents >= 0),
  due_on date not null,
  paid_at timestamptz,
  status text not null default 'pending' check (status in ('pending', 'paid', 'overdue', 'canceled')),
  created_at timestamptz not null default now()
);
create index subscription_payments_gym_idx on public.subscription_payments (gym_id, due_on desc);

-- ---------------------------------------------------------------------------
-- IA
-- ---------------------------------------------------------------------------
create table public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  student_id uuid references public.students (id) on delete cascade,
  title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index ai_conversations_user_idx on public.ai_conversations (user_id, updated_at desc);
create trigger ai_conversations_updated_at before update on public.ai_conversations
  for each row execute function public.set_updated_at();

create table public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.ai_conversations (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index ai_messages_conversation_idx on public.ai_messages (conversation_id, created_at);

-- ---------------------------------------------------------------------------
-- Auditoria de ações administrativas
-- ---------------------------------------------------------------------------
create table public.audit_logs (
  id bigint generated always as identity primary key,
  gym_id uuid references public.gyms (id) on delete cascade,
  actor_id uuid references auth.users (id) on delete set null,
  action text not null,
  table_name text not null,
  record_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index audit_logs_gym_idx on public.audit_logs (gym_id, created_at desc);
