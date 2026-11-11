-- Painel da academia e do personal: convites, vínculo e limites de acesso.
begin;
create extension if not exists pgtap with schema extensions;
select plan(13);

insert into auth.users (id, email, email_confirmed_at) values
  ('d1000000-0000-0000-0000-000000000001', 'dono@academia.dev', now()),
  ('d1000000-0000-0000-0000-000000000002', 'aluno@teste.dev', now()),
  ('d1000000-0000-0000-0000-000000000003', 'personal@teste.dev', now()),
  ('d1000000-0000-0000-0000-000000000004', 'intruso@teste.dev', now());

set local role authenticated;

-- Dono cria a academia
select set_config('request.jwt.claims', '{"sub":"d1000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
select lives_ok($$insert into public.gyms (id, name, slug) values ('9a000000-0000-0000-0000-000000000001', 'Academia Teste', 'academia-teste')$$, 'dono cria a academia');
select is(public.is_gym_admin('9a000000-0000-0000-0000-000000000001'), true, 'dono vira administrador');
select lives_ok($$insert into public.gym_invites (gym_id, email, role) values ('9a000000-0000-0000-0000-000000000001', 'aluno@teste.dev', 'student'), ('9a000000-0000-0000-0000-000000000001', 'personal@teste.dev', 'trainer')$$, 'dono convida aluno e personal');

-- Antes de aceitar, a academia não vê nada do aluno
select set_config('request.jwt.claims', '{"sub":"d1000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
insert into public.students (user_id) values ('d1000000-0000-0000-0000-000000000002');
insert into public.physical_assessments (student_id, weight_kg) values (public.my_student_id(), 70);
select set_config('request.jwt.claims', '{"sub":"d1000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
select is((select count(*) from public.physical_assessments)::int, 0, 'academia não vê dados de quem ainda não aceitou');

-- Intruso não aceita convite alheio
select set_config('request.jwt.claims', '{"sub":"d1000000-0000-0000-0000-000000000004","role":"authenticated"}', true);
select is((select count(*) from public.gym_invites)::int, 0, 'intruso não vê convites de outros');
select throws_ok($$select public.respond_gym_invite((select id from public.gym_invites limit 1), true)$$, 'P0002', null, 'intruso não aceita convite alheio');

-- Aluno aceita
select set_config('request.jwt.claims', '{"sub":"d1000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
select is((select count(*) from public.gym_invites)::int, 1, 'aluno vê o próprio convite');
select is(public.respond_gym_invite((select id from public.gym_invites limit 1), true), 'accepted', 'aluno aceita o convite');

-- Personal aceita
select set_config('request.jwt.claims', '{"sub":"d1000000-0000-0000-0000-000000000003","role":"authenticated"}', true);
select is(public.respond_gym_invite((select id from public.gym_invites limit 1), true), 'accepted', 'personal aceita o convite');
select is((select count(*) from public.physical_assessments)::int, 0, 'personal ainda não vinculado não vê o aluno');

-- Dono vincula personal e aluno
select set_config('request.jwt.claims', '{"sub":"d1000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
select is((select count(*) from public.physical_assessments)::int, 1, 'academia vê o aluno após o aceite');
select lives_ok(
  $$insert into public.trainer_students (trainer_id, student_id)
    select t.id, s.id from public.trainers t, public.students s
    where t.user_id = 'd1000000-0000-0000-0000-000000000003' and s.user_id = 'd1000000-0000-0000-0000-000000000002'$$,
  'dono vincula personal ao aluno'
);

select set_config('request.jwt.claims', '{"sub":"d1000000-0000-0000-0000-000000000003","role":"authenticated"}', true);
select is((select count(*) from public.physical_assessments)::int, 1, 'personal vinculado passa a ver o aluno');

reset role;
select * from finish();
rollback;
