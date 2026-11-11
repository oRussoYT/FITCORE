begin;
create extension if not exists pgtap with schema extensions;
select plan(4);

insert into auth.users (id, email, email_confirmed_at) values ('eeeeeeee-0000-0000-0000-000000000001', 'fa@teste.dev', now());
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"eeeeeeee-0000-0000-0000-000000000001","role":"authenticated"}', true);

select lives_ok($$insert into public.platform_reviews (user_id, rating, body, display_name) values ('eeeeeeee-0000-0000-0000-000000000001', 5, 'Primeira avaliação do app.', 'Fã')$$, 'primeira avaliação');
select lives_ok($$insert into public.platform_reviews (user_id, rating, body, display_name) values ('eeeeeeee-0000-0000-0000-000000000001', 4, 'Segunda avaliação, meses depois.', 'Fã')$$, 'segunda avaliação é permitida');
select lives_ok($$insert into public.platform_reviews (user_id, rating, body, display_name) values ('eeeeeeee-0000-0000-0000-000000000001', 5, 'Terceira avaliação no mesmo dia.', 'Fã')$$, 'terceira no mesmo dia');
select throws_ok($$insert into public.platform_reviews (user_id, rating, body, display_name) values ('eeeeeeee-0000-0000-0000-000000000001', 5, 'Quarta avaliação no mesmo dia.', 'Fã')$$, 'P0001', null, 'quarta no mesmo dia é bloqueada');

reset role;
select * from finish();
rollback;
