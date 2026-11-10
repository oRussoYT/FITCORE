-- Testes de permissões (RLS). Rodam automaticamente no GitHub a cada envio.
begin;
create extension if not exists pgtap with schema extensions;
select plan(28);

-- Pessoas
--   A  = aluno da Academia 1, vinculado ao personal T
--   B  = aluno independente (sem academia)
--   T  = personal da Academia 1
--   AD = administrador da Academia 1
--   OX = administrador de outra academia
insert into auth.users (id, email, raw_user_meta_data) values
  ('a0000000-0000-0000-0000-00000000000a', 'aluno.a@teste.dev', '{"full_name":"Aluno A"}'),
  ('b0000000-0000-0000-0000-00000000000b', 'aluno.b@teste.dev', '{}'),
  ('c0000000-0000-0000-0000-00000000000c', 'personal@teste.dev', '{}'),
  ('d0000000-0000-0000-0000-00000000000d', 'admin@teste.dev', '{}'),
  ('e0000000-0000-0000-0000-00000000000e', 'outro.admin@teste.dev', '{}');

select is(
  (select full_name from public.profiles where id = 'a0000000-0000-0000-0000-00000000000a'),
  'Aluno A',
  'perfil é criado automaticamente no cadastro'
);

insert into public.gyms (id, name, slug, created_by) values
  ('90000000-0000-0000-0000-000000000001', 'Academia 1', 'academia-1', 'd0000000-0000-0000-0000-00000000000d'),
  ('90000000-0000-0000-0000-000000000002', 'Academia 2', 'academia-2', 'e0000000-0000-0000-0000-00000000000e');

select ok(
  exists (select 1 from public.gym_members where gym_id = '90000000-0000-0000-0000-000000000001' and user_id = 'd0000000-0000-0000-0000-00000000000d' and role = 'admin'),
  'quem cria a academia vira administrador'
);

insert into public.students (id, user_id, gym_id) values
  ('5a000000-0000-0000-0000-00000000000a', 'a0000000-0000-0000-0000-00000000000a', '90000000-0000-0000-0000-000000000001'),
  ('5b000000-0000-0000-0000-00000000000b', 'b0000000-0000-0000-0000-00000000000b', null);
insert into public.gym_members (gym_id, user_id, role) values
  ('90000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-00000000000a', 'student'),
  ('90000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-00000000000c', 'trainer');
insert into public.trainers (id, user_id, gym_id) values
  ('70000000-0000-0000-0000-00000000000c', 'c0000000-0000-0000-0000-00000000000c', '90000000-0000-0000-0000-000000000001');
insert into public.trainer_students (trainer_id, student_id) values
  ('70000000-0000-0000-0000-00000000000c', '5a000000-0000-0000-0000-00000000000a');

insert into public.physical_assessments (id, student_id, weight_kg) values
  ('aa000000-0000-0000-0000-000000000001', '5a000000-0000-0000-0000-00000000000a', 78),
  ('bb000000-0000-0000-0000-000000000001', '5b000000-0000-0000-0000-00000000000b', 90);
insert into public.body_photos (student_id, storage_path, pose, consent_at) values
  ('5a000000-0000-0000-0000-00000000000a', '5a000000-0000-0000-0000-00000000000a/frente.jpg', 'front', now());
insert into public.ai_conversations (id, user_id, student_id, title) values
  ('ac000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-00000000000a', '5a000000-0000-0000-0000-00000000000a', 'Minha conversa');
insert into public.notifications (user_id, kind, title) values
  ('a0000000-0000-0000-0000-00000000000a', 'system', 'Olá A');

-- ===================== Aluno A =====================
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);

select is((select count(*) from public.physical_assessments)::int, 1, 'aluno A vê apenas a própria avaliação');
select is((select count(*) from public.students)::int, 1, 'aluno A vê apenas o próprio cadastro de aluno');
select throws_ok(
  $$insert into public.physical_assessments (student_id, weight_kg) values ('5b000000-0000-0000-0000-00000000000b', 80)$$,
  '42501', null, 'aluno A não consegue gravar avaliação para o aluno B'
);
select lives_ok(
  $$insert into public.physical_assessments (student_id, weight_kg) values ('5a000000-0000-0000-0000-00000000000a', 77.5)$$,
  'aluno A grava a própria avaliação'
);
insert into public.body_measurements (assessment_id, student_id, site, value_cm)
  values ('aa000000-0000-0000-0000-000000000001', '5b000000-0000-0000-0000-00000000000b', 'waist', 84);
select is(
  (select student_id from public.body_measurements where assessment_id = 'aa000000-0000-0000-0000-000000000001' and site = 'waist'),
  '5a000000-0000-0000-0000-00000000000a'::uuid,
  'medida sempre fica com o aluno dono da avaliação, mesmo se outro id for enviado'
);
select is((select count(*) from public.audit_logs)::int, 0, 'aluno não vê registros de auditoria');
select is((select count(*) from public.profiles where id = 'c0000000-0000-0000-0000-00000000000c')::int, 1, 'aluno vê o perfil do seu personal');
select is((select count(*) from public.profiles where id = 'b0000000-0000-0000-0000-00000000000b')::int, 0, 'aluno não vê perfil de outro aluno');
select throws_ok(
  $$insert into public.achievements (student_id, code, title) values ('5a000000-0000-0000-0000-00000000000a', 'fake', 'Medalha falsa')$$,
  '42501', null, 'aluno não consegue se dar conquistas sozinho'
);
select lives_ok(
  $$insert into storage.objects (bucket_id, name, owner) values ('body-photos', '5a000000-0000-0000-0000-00000000000a/costas.jpg', 'a0000000-0000-0000-0000-00000000000a')$$,
  'aluno A envia foto para a própria pasta'
);

-- ===================== Aluno B =====================
select set_config('request.jwt.claims', '{"sub":"b0000000-0000-0000-0000-00000000000b","role":"authenticated"}', true);

select is((select count(*) from public.physical_assessments where student_id = '5a000000-0000-0000-0000-00000000000a')::int, 0, 'aluno B não vê avaliações do aluno A');
select is((select count(*) from public.body_photos)::int, 0, 'aluno B não vê fotos do aluno A');
select is((select count(*) from public.ai_conversations)::int, 0, 'aluno B não vê conversas de IA do aluno A');
select is((select count(*) from public.notifications)::int, 0, 'aluno B não vê notificações do aluno A');
select throws_ok(
  $$insert into storage.objects (bucket_id, name, owner) values ('body-photos', '5a000000-0000-0000-0000-00000000000a/invasao.jpg', 'b0000000-0000-0000-0000-00000000000b')$$,
  '42501', null, 'aluno B não consegue enviar arquivo na pasta do aluno A'
);

-- ===================== Personal T =====================
select set_config('request.jwt.claims', '{"sub":"c0000000-0000-0000-0000-00000000000c","role":"authenticated"}', true);

select ok((select count(*) from public.physical_assessments where student_id = '5a000000-0000-0000-0000-00000000000a') > 0, 'personal vê avaliações do aluno vinculado');
select is((select count(*) from public.physical_assessments where student_id = '5b000000-0000-0000-0000-00000000000b')::int, 0, 'personal não vê aluno não vinculado');
select is((select count(*) from public.body_photos)::int, 1, 'personal vinculado vê as fotos do aluno');
select is((select count(*) from public.ai_conversations)::int, 0, 'personal não lê as conversas privadas do aluno com a IA');

-- ===================== Admin da Academia 1 =====================
select set_config('request.jwt.claims', '{"sub":"d0000000-0000-0000-0000-00000000000d","role":"authenticated"}', true);

select ok((select count(*) from public.physical_assessments where student_id = '5a000000-0000-0000-0000-00000000000a') > 0, 'admin vê avaliações de aluno da sua academia');
select is((select count(*) from public.physical_assessments where student_id = '5b000000-0000-0000-0000-00000000000b')::int, 0, 'admin não vê aluno fora da academia');
select is((select count(*) from public.body_photos)::int, 0, 'admin não vê fotos corporais (privacidade)');
select ok((select count(*) from public.audit_logs) > 0, 'admin vê o registro de ações da sua academia');

-- ===================== Admin de outra academia =====================
select set_config('request.jwt.claims', '{"sub":"e0000000-0000-0000-0000-00000000000e","role":"authenticated"}', true);

select is((select count(*) from public.students)::int, 0, 'admin de outra academia não vê alunos da Academia 1');
select throws_ok(
  $$insert into public.students (user_id, gym_id) values ('e0000000-0000-0000-0000-00000000000e', '90000000-0000-0000-0000-000000000001')$$,
  '42501', null, 'admin de outra academia não cadastra aluno na Academia 1'
);

-- ===================== Visitante sem login =====================
reset role;
set local role anon;
select throws_ok($$select count(*) from public.profiles$$, '42501', null, 'visitante sem login não acessa perfis');

reset role;
select * from finish();
rollback;
