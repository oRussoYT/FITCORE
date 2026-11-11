-- Administrador da plataforma controla academias (suspender, reativar, ver equipe).
begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

insert into auth.users (id, email, email_confirmed_at) values
  ('e1000000-0000-0000-0000-000000000001', 'plataforma@teste.dev', now()),
  ('e1000000-0000-0000-0000-000000000002', 'dono2@academia.dev', now());
insert into private.platform_admin_emails (email) values ('plataforma@teste.dev');

set local role authenticated;

select set_config('request.jwt.claims', '{"sub":"e1000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
insert into public.gyms (id, name, slug) values ('9b000000-0000-0000-0000-000000000001', 'Academia Dois', 'academia-dois');
select is(public.is_gym_admin('9b000000-0000-0000-0000-000000000001'), true, 'dono administra a academia');
select throws_ok($$update public.gyms set suspended_at = null where id = '9b000000-0000-0000-0000-000000000001'$$, '42501', null, 'dono não mexe na suspensão');
select lives_ok($$update public.gyms set name = 'Academia Dois Novo' where id = '9b000000-0000-0000-0000-000000000001'$$, 'dono ainda pode renomear');
select throws_ok($$select * from public.admin_list_gyms()$$, 'P0002', null, 'dono não acessa a lista da plataforma');

select set_config('request.jwt.claims', '{"sub":"e1000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal2"}', true);
select ok((select count(*) from public.admin_list_gyms() where id = '9b000000-0000-0000-0000-000000000001') = 1, 'admin da plataforma vê a academia');
select is((select count(*) from public.admin_gym_members('9b000000-0000-0000-0000-000000000001'))::int, 1, 'admin vê a equipe');
select lives_ok($$select public.admin_set_gym_suspended('9b000000-0000-0000-0000-000000000001', true, 'teste')$$, 'admin suspende');

select set_config('request.jwt.claims', '{"sub":"e1000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
select is(public.is_gym_admin('9b000000-0000-0000-0000-000000000001'), false, 'academia suspensa perde a gestão');
select ok((select suspended_at is not null from public.gyms where id = '9b000000-0000-0000-0000-000000000001'), 'dono ainda vê o aviso de suspensão');

select set_config('request.jwt.claims', '{"sub":"e1000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal2"}', true);
select public.admin_set_gym_suspended('9b000000-0000-0000-0000-000000000001', false);
select set_config('request.jwt.claims', '{"sub":"e1000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
select is(public.is_gym_admin('9b000000-0000-0000-0000-000000000001'), true, 'reativada volta ao normal');

reset role;
select * from finish();
rollback;
