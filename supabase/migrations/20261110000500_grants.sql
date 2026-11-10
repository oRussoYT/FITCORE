-- Permissões explícitas para usuários logados.
-- O que cada um realmente enxerga continua decidido pelas regras de RLS.
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
grant execute on all functions in schema public to authenticated;

-- Tabelas com escrita apenas pelo servidor/gatilhos.
revoke insert, update, delete on public.audit_logs from authenticated;
revoke insert, update, delete on public.muscle_groups from authenticated;
