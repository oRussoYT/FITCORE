-- Correção: ao criar o próprio cadastro de aluno, a leitura de retorno (insert ... returning)
-- era bloqueada, porque a função de permissão consulta a tabela antes da nova linha existir.
-- O dono passa a ser reconhecido diretamente pela coluna user_id.
drop policy if exists students_select on public.students;
create policy students_select on public.students for select to authenticated
  using (user_id = (select auth.uid()) or public.can_view_student(id));
