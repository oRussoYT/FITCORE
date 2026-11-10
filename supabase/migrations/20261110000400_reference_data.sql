-- Dados de referência (não são dados de alunos).

insert into public.muscle_groups (slug, name, region, sort_order) values
  ('chest', 'Peitoral', 'upper', 1),
  ('shoulders', 'Ombros', 'upper', 2),
  ('biceps', 'Bíceps', 'upper', 3),
  ('triceps', 'Tríceps', 'upper', 4),
  ('forearms', 'Antebraços', 'upper', 5),
  ('abs', 'Abdômen', 'core', 6),
  ('back', 'Costas', 'upper', 7),
  ('traps', 'Trapézio', 'upper', 8),
  ('quads', 'Quadríceps', 'lower', 9),
  ('hamstrings', 'Posterior de coxa', 'lower', 10),
  ('calves', 'Panturrilhas', 'lower', 11),
  ('glutes', 'Glúteos', 'lower', 12)
on conflict (slug) do nothing;

-- Catálogo global inicial de exercícios (gym_id e created_by nulos = visível a todos).
insert into public.exercises (name, primary_muscle, secondary_muscles, equipment, instructions) values
  ('Supino reto com barra', 'chest', '{triceps,shoulders}', 'Barra', 'Escápulas retraídas, pés firmes no chão. Desça a barra até a linha média do peito e empurre sem tirar o quadril do banco.'),
  ('Supino inclinado com halteres', 'chest', '{shoulders,triceps}', 'Halteres', 'Banco entre 30° e 45°. Desça os halteres de forma controlada até a lateral do peito.'),
  ('Crucifixo na máquina', 'chest', '{shoulders}', 'Máquina', 'Cotovelos levemente flexionados durante todo o movimento. Una as mãos à frente do peito sem bater os pegadores.'),
  ('Desenvolvimento com halteres', 'shoulders', '{triceps}', 'Halteres', 'Sentado com apoio nas costas. Empurre os halteres acima da cabeça sem arquear a lombar.'),
  ('Elevação lateral', 'shoulders', '{traps}', 'Halteres', 'Eleve os braços até a altura dos ombros, com cotovelos levemente flexionados e sem balançar o tronco.'),
  ('Rosca direta com barra', 'biceps', '{forearms}', 'Barra', 'Cotovelos junto ao corpo. Suba a barra sem projetar o quadril para a frente.'),
  ('Rosca martelo', 'biceps', '{forearms}', 'Halteres', 'Pegada neutra (palmas voltadas uma para a outra). Movimento controlado na subida e na descida.'),
  ('Tríceps na polia com corda', 'triceps', '{}', 'Polia', 'Cotovelos fixos ao lado do corpo. Estenda os braços e afaste as pontas da corda no final.'),
  ('Tríceps francês com halter', 'triceps', '{}', 'Halteres', 'Cotovelos apontados para cima. Desça o halter atrás da cabeça e estenda os braços.'),
  ('Rosca de punho', 'forearms', '{}', 'Barra', 'Antebraços apoiados no banco. Flexione apenas os punhos.'),
  ('Prancha', 'abs', '{shoulders,glutes}', 'Peso corporal', 'Corpo alinhado da cabeça aos calcanhares. Contraia abdômen e glúteos e respire normalmente.'),
  ('Abdominal na polia', 'abs', '{}', 'Polia', 'Ajoelhado, flexione o tronco aproximando as costelas do quadril.'),
  ('Puxada frontal', 'back', '{biceps}', 'Polia', 'Puxe a barra até a parte de cima do peito levando os cotovelos para baixo e para trás.'),
  ('Remada curvada com barra', 'back', '{biceps,traps}', 'Barra', 'Tronco inclinado e coluna neutra. Puxe a barra em direção ao abdômen.'),
  ('Remada baixa na polia', 'back', '{biceps}', 'Polia', 'Coluna ereta. Puxe o pegador até o abdômen aproximando as escápulas.'),
  ('Encolhimento com halteres', 'traps', '{forearms}', 'Halteres', 'Eleve os ombros em direção às orelhas sem girá-los.'),
  ('Agachamento livre', 'quads', '{glutes,hamstrings}', 'Barra', 'Pés na largura dos ombros. Desça mantendo a coluna neutra e os joelhos alinhados com a ponta dos pés.'),
  ('Leg press 45°', 'quads', '{glutes}', 'Máquina', 'Lombar sempre apoiada. Não trave os joelhos no final do movimento.'),
  ('Cadeira extensora', 'quads', '{}', 'Máquina', 'Estenda os joelhos de forma controlada e segure um instante no topo.'),
  ('Stiff com barra', 'hamstrings', '{glutes,back}', 'Barra', 'Joelhos levemente flexionados. Leve o quadril para trás mantendo a barra próxima às pernas.'),
  ('Mesa flexora', 'hamstrings', '{calves}', 'Máquina', 'Quadril apoiado no banco. Flexione os joelhos sem tirar o quadril do apoio.'),
  ('Panturrilha em pé', 'calves', '{}', 'Máquina', 'Amplitude completa: desça o calcanhar e suba até a ponta dos pés.'),
  ('Elevação pélvica', 'glutes', '{hamstrings}', 'Barra', 'Costas apoiadas no banco. Eleve o quadril até alinhar com o tronco e contraia os glúteos.'),
  ('Cadeira abdutora', 'glutes', '{}', 'Máquina', 'Afaste as pernas de forma controlada mantendo o tronco apoiado.');
