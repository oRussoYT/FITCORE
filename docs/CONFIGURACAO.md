# FITCORE AI — guia de configuração (sem Terminal)

## O que já está pronto

| Peça | Onde | Situação |
| --- | --- | --- |
| Código | GitHub `oRussoYT/FITCORE` | Pronto |
| Banco de dados | Supabase, organização **FITCORE**, projeto **fitcore** | Instalado (33 tabelas com regras de acesso) |
| Testes automáticos | GitHub → aba **Actions** | Rodam sozinhos a cada mudança |
| Publicação | Vercel | Depende do seu login |

## Variáveis de ambiente (Vercel → Settings → Environment Variables)

| Nome | De onde vem | Pública? |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → Project URL | Sim (vai para o navegador) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → API Keys → `anon` `public` | Sim (protegida pelas regras do banco) |
| `NEXT_PUBLIC_SITE_URL` | Endereço do site na Vercel | Sim |
| `ANTHROPIC_API_KEY` ou `OPENAI_API_KEY` | Painel da Anthropic/OpenAI (Fase 6) | **Não** — só no servidor |

Nunca coloque a chave `service_role` do Supabase nem chaves de IA no código: o repositório é público.

## Supabase → Authentication → URL Configuration

- **Site URL**: o endereço do site na Vercel.
- **Redirect URLs**: `https://SEU-SITE.vercel.app/auth/callback` (e `http://localhost:3000/auth/callback` para testes locais).

## Login com Google (opcional)

1. Google Cloud Console → crie credenciais OAuth (tipo "Aplicativo da Web").
2. Em "URIs de redirecionamento", use a URL de callback mostrada em Supabase → Authentication → Providers → Google.
3. Cole Client ID e Secret nesse mesmo lugar do Supabase e ative o provedor.

Enquanto isso não for feito, o botão "Continuar com Google" mostra uma mensagem clara de que o provedor não está ativo.

## Banco de dados

As migrações ficam em `supabase/migrations/`, em ordem. Elas já foram aplicadas no projeto **fitcore**
(e registradas em `supabase_migrations.schema_migrations`). Mudanças futuras entram como novos arquivos.

Testes de permissão: `supabase/tests/001_permissions.test.sql` — simulam aluno, outro aluno, personal,
administrador e administrador de outra academia, e confirmam quem consegue ver o quê.

## Como testar

1. Abra o site e crie uma conta.
2. Confirme o e-mail (o Supabase envia o link).
3. Complete os 7 passos do cadastro.
4. No painel, veja peso e IMC já calculados com seus dados.
5. Em **Minha evolução → Nova avaliação**, registre uma segunda avaliação: os cartões passam a mostrar diferença e variação.
6. Em **Perfil**, baixe seus dados ou teste a exclusão.

## Área administrativa (oculta)

- O endereço da área fica na variável secreta `ADMIN_PATH` da Vercel (só Production). Ele nunca aparece no código.
  Para trocar: edite a variável e publique de novo.
- Quem é admin fica registrado só no banco (`private.platform_admin_emails`). A conta vira admin quando o e-mail é confirmado.
- Primeiro acesso: crie a conta com o e-mail autorizado, confirme o e-mail, abra o endereço secreto e cadastre o
  app autenticador (QR code). Depois disso, toda entrada pede o código de 6 números.
- Para qualquer outra pessoa, o endereço se comporta como uma página protegida comum ou inexistente.
