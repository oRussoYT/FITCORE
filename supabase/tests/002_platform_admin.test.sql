-- Testes da área administrativa oculta.
begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

insert into auth.users (id, email, email_confirmed_at) values
  ('11111111-1111-1111-1111-111111111111', 'chefe@teste.dev', now()),
  ('22222222-2222-2222-2222-222222222222', 'curioso@teste.dev', now()),
  ('33333333-3333-3333-3333-333333333333', 'naoconfirmado@teste.dev', null);

insert into private.platform_admin_emails (email) values ('chefe@teste.dev'), ('naoconfirmado@teste.dev');

select ok(exists (select 1 from private.platform_admins where user_id = '11111111-1111-1111-1111-111111111111'), 'e-mail autorizado e confirmado vira admin');
select ok(not exists (select 1 from private.platform_admins where user_id = '33333333-3333-3333-3333-333333333333'), 'e-mail não confirmado NÃO vira admin');

set local role authenticated;

-- Usuário comum
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated","aal":"aal2"}', true);
select is(public.is_platform_admin(), false, 'usuário comum não é admin');
select throws_ok($$select public.admin_overview()$$, 'P0002', null, 'usuário comum recebe "não encontrado" no painel');
select throws_ok($$select * from public.admin_list_users()$$, 'P0002', null, 'usuário comum não lista usuários');
select throws_ok($$select * from private.platform_admins$$, '42501', null, 'tabelas privadas são inacessíveis pela API');

-- Admin sem segundo fator
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated","aal":"aal1"}', true);
select is(public.is_platform_admin(), true, 'admin é reconhecido');
select throws_ok($$select public.admin_overview()$$, '42501', null, 'admin sem 2 fatores é bloqueado');

-- Admin com segundo fator
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated","aal":"aal2"}', true);
select ok((public.admin_overview() ->> 'users_total')::int >= 3, 'admin com 2 fatores vê o resumo');
select ok((select count(*) from public.admin_recent_audit()) >= 1, 'acessos do admin ficam registrados');

reset role;
select * from finish();
rollback;
