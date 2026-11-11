-- Simula o fluxo real do cadastro guiado feito pelo próprio usuário (sem permissões de sistema).
begin;
create extension if not exists pgtap with schema extensions;
select plan(5);

insert into auth.users (id, email, email_confirmed_at) values ('cccccccc-0000-0000-0000-000000000001', 'novo@teste.dev', now());

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"cccccccc-0000-0000-0000-000000000001","role":"authenticated"}', true);

select lives_ok(
  $$insert into public.students (user_id) values ('cccccccc-0000-0000-0000-000000000001') returning id, user_id, gym_id, status$$,
  'usuário cria o próprio cadastro de aluno e recebe a linha de volta'
);
select lives_ok(
  $$update public.profiles set full_name = 'Novo Aluno', onboarding_step = 1 where id = 'cccccccc-0000-0000-0000-000000000001'$$,
  'usuário atualiza o próprio perfil'
);
select lives_ok(
  $$insert into public.physical_assessments (student_id, weight_kg, height_cm) values (public.my_student_id(), 80, 180) returning id$$,
  'usuário cria a avaliação inicial e recebe o id'
);
select lives_ok(
  $$insert into public.body_measurements (assessment_id, student_id, site, value_cm)
    select id, student_id, 'waist', 85 from public.physical_assessments where student_id = public.my_student_id()$$,
  'usuário grava medidas na avaliação'
);
select lives_ok(
  $$insert into public.notifications (user_id, kind, title) values ('cccccccc-0000-0000-0000-000000000001', 'system', 'Cadastro concluído')$$,
  'usuário recebe notificação de conclusão'
);

reset role;
select * from finish();
rollback;
