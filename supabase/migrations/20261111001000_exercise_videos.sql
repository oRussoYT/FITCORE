-- Vídeos de execução (YouTube, incorporação oficial) para o catálogo global de exercícios.
-- O vídeo continua hospedado no canal do autor; o crédito aparece no modo de treino.
alter table public.exercises add column if not exists media_credit text check (char_length(media_credit) <= 120);

update public.exercises e
   set media_url = 'https://www.youtube.com/watch?v=' || v.id,
       media_credit = v.credit
  from (values
    ('Supino reto com barra', '72UUJVBuT7o', 'Hipertrofia'),
    ('Supino inclinado com halteres', 'JOVGGEwfhIk', '4Nutrition Oficial'),
    ('Crucifixo na máquina', 'cZ75YmWYTgQ', 'Academia Brown Fit'),
    ('Desenvolvimento com halteres', 'ja3qMvBtaXQ', 'Academia Projeto Fit'),
    ('Elevação lateral', 'ORparUDksUk', 'Guilherme Stellbrink | FisioPrev'),
    ('Rosca direta com barra', 'ixqsd_vYXI4', 'Renan Koiti'),
    ('Rosca martelo', '5vPGH1uTtbs', 'MyTrainingPRO'),
    ('Tríceps na polia com corda', 'MWi5nJgFh6o', 'Allan Henrique Evaristo'),
    ('Tríceps francês com halter', 'qLnV4qPXeSw', '4Nutrition Oficial'),
    ('Rosca de punho', 'K7ghYI10T2c', 'Italo'),
    ('Prancha', '5FWJJxSH4io', 'Jonathan Augusto Fit'),
    ('Abdominal na polia', '6Tf4tw8-bgw', 'Dno Fit'),
    ('Puxada frontal', 'yzlQK3s-a_Y', 'Hipertrofia'),
    ('Remada curvada com barra', '_vO2dAnz__c', 'Via Brasil Club'),
    ('Remada baixa na polia', 'dUy0chKG-yo', 'Academia Brown Fit'),
    ('Encolhimento com halteres', 'bbSRqGlzdWU', 'Italo'),
    ('Agachamento livre', 'DrZf97MCKqI', 'Rafael Dias'),
    ('Leg press 45°', 'YmKd0StxtXQ', 'Hipertrofia'),
    ('Cadeira extensora', '-R3bDwWoREU', 'Hipertrofia'),
    ('Stiff com barra', 'F8q6ZIizAcY', 'Miqueias Alves Personal'),
    ('Mesa flexora', 'KAdhX6otnng', '4Nutrition Oficial'),
    ('Panturrilha em pé', 'cklp_Xh5V8M', 'Four Fit Academia'),
    ('Elevação pélvica', 'WA2Q1auA1zY', 'Nei Farinazo'),
    ('Cadeira abdutora', 'MTertNF574c', 'Gold Center Fit')
  ) as v(name, id, credit)
 where e.name = v.name and e.gym_id is null and e.created_by is null;
