-- Hidratação: cada pessoa registra e vê a própria água; estranhos não veem nada.
begin;
create extension if not exists pgtap with schema extensions;
select plan(5);

insert into auth.users (id, email, email_confirmed_at) values
  ('f1000000-0000-0000-0000-000000000001', 'agua@teste.dev', now()),
  ('f1000000-0000-0000-0000-000000000002', 'outro@teste.dev', now());

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"f1000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
insert into public.students (id, user_id) values ('f2000000-0000-0000-0000-000000000001', 'f1000000-0000-0000-0000-000000000001');
select lives_ok($$insert into public.water_logs (student_id, amount_ml) values (public.my_student_id(), 250)$$, 'aluno registra água');
select throws_ok($$insert into public.water_logs (student_id, amount_ml) values (public.my_student_id(), 99999)$$, '23514', null, 'quantidade absurda é recusada');
select is((select sum(amount_ml)::int from public.water_logs), 250, 'aluno vê o próprio total');

select set_config('request.jwt.claims', '{"sub":"f1000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
insert into public.students (user_id) values ('f1000000-0000-0000-0000-000000000002');
select is((select count(*) from public.water_logs)::int, 0, 'outra pessoa não vê a água alheia');
select throws_ok($$insert into public.water_logs (student_id, amount_ml) values ('f2000000-0000-0000-0000-000000000001', 250)$$, '42501', null, 'ninguém registra em nome de outro');

reset role;
select * from finish();
rollback;
