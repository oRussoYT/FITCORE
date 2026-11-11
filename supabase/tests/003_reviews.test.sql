-- Avaliações: só aparecem depois de aprovadas, e o autor não consegue se autoaprovar.
begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

insert into auth.users (id, email, email_confirmed_at) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'aluna@teste.dev', now()),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'admin@teste.dev', now());
insert into private.platform_admin_emails (email) values ('admin@teste.dev');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1"}', true);

select lives_ok(
  $$insert into public.platform_reviews (user_id, rating, body, display_name) values ('aaaaaaaa-0000-0000-0000-000000000001', 5, 'Gostei muito de ver minhas medidas evoluindo.', 'Ana')$$,
  'aluna envia avaliação'
);
select throws_ok(
  $$insert into public.platform_reviews (user_id, rating, body, display_name) values ('aaaaaaaa-0000-0000-0000-000000000002', 5, 'Avaliação em nome de outra pessoa.', 'Falso')$$,
  '42501', null, 'ninguém avalia em nome de outra pessoa'
);
update public.platform_reviews set status = 'approved' where user_id = 'aaaaaaaa-0000-0000-0000-000000000001';
select is((select status from public.platform_reviews where user_id = 'aaaaaaaa-0000-0000-0000-000000000001'), 'pending', 'autor não consegue se autoaprovar');
select is((select count(*) from public.public_reviews())::int, 0, 'pendente não aparece na homepage');
select throws_ok($$select * from public.admin_list_reviews()$$, 'P0002', null, 'aluna não acessa a moderação');

select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000002","role":"authenticated","aal":"aal2"}', true);
select lives_ok(
  $$select public.admin_moderate_review((select id from public.admin_list_reviews() limit 1), 'approved')$$,
  'admin com 2 fatores aprova'
);

reset role;
set local role anon;
select is((select count(*) from public.public_reviews())::int, 1, 'aprovada aparece para visitantes');
select is((select display_name from public.public_reviews() limit 1), 'Ana', 'homepage recebe só nome de exibição e texto');

reset role;
select * from finish();
rollback;
