-- Cada pessoa pode enviar mais de uma avaliação (ex.: depois de alguns meses de uso).
-- Limite de 3 por dia para evitar abuso.
alter table public.platform_reviews drop constraint if exists platform_reviews_user_id_key;
create index if not exists platform_reviews_user_idx on public.platform_reviews (user_id, created_at desc);

create or replace function public.reviews_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.platform_reviews r
      where r.user_id = new.user_id and r.created_at > now() - interval '24 hours') >= 3 then
    raise exception 'limite de avaliações atingido' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists platform_reviews_rate_limit on public.platform_reviews;
create trigger platform_reviews_rate_limit before insert on public.platform_reviews
  for each row execute function public.reviews_rate_limit();
