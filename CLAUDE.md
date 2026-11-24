# Tempestivo

SaaS web para advogados autônomos: **nunca perder prazo e receber honorário**. Projeto do Startup Challenge UMC 2026 (Mestres da Web). MVP entregue em 25/11/2026, final em 27/11/2026. Congelar funcionalidades em 17/11.

Nome do produto provisório (checar INPI e Registro.br). Equipe de duas pessoas.

## Regras que valem sempre

1. **Custo zero.** Nada que exija cartão, plano pago ou serviço pago. Se a solução ideal custa, use a alternativa grátis e registre a evolução no roadmap.
2. **Português do Brasil** em telas, mensagens e commits. Datas no formato dd/mm/aaaa, fuso `America/Sao_Paulo`.
3. **Todo registro pertence a uma `conta`.** Todo repositório de dados recebe `contaId` como parâmetro obrigatório. Nunca consultar por id sem filtrar pela conta.
4. **A IA só sugere.** O leitor de intimação cria rascunho; o prazo só existe depois da confirmação do advogado.
5. **Prazo calculado é auxiliar.** A tela sempre diz "cálculo auxiliar, confira". Regra de prazo só entra com teste e validação de um advogado (ver skill `calculadora-de-prazos`).
6. **Dados reais de clientes nunca vão para a IA gratuita.** Em demonstração e testes, usar só dados fictícios.
7. **Portabilidade.** Tudo externo (banco, arquivos, e-mail, notificação, IA, agendador) fica atrás de uma interface em `src/platform/`. Nada exclusivo do Vercel (KV, Blob, Edge Config).
8. **Mobile-first.** Toda tela funciona em 360 px, 768 px e 1280 px de largura.

## Stack

- Next.js (App Router) + TypeScript + Tailwind + shadcn/ui
- PostgreSQL (Supabase usado como Postgres puro) + Prisma
- Login próprio com Better Auth (senhas com Argon2), tabelas no nosso banco
- E-mail: SMTP (Gmail ou Brevo). WhatsApp: só link `wa.me`, sem API
- Leitor de intimação: extrator local por regras atrás da porta `ai` (um modelo de linguagem entra como outro driver)
- Arquivos (Supabase Storage via S3) e push (PWA): no roadmap; as portas voltam com o módulo que precisar
- Agendador: GitHub Actions chamando `/api/jobs/*` com segredo
- Deploy: Vercel Hobby; imagem Docker pronta para migrar
- Testes: Vitest (domínio) e Playwright (telas)
- Gerenciador de pacotes: pnpm

## Arquitetura

Monólito modular. Estrutura:

```
src/
  modules/<modulo>/   conta, clientes, processos, prazos, alertas, intimacao,
                      honorarios, audiencias, tarefas, agenda
                      (domínio, serviço, repositório; só o index.ts é público)
  platform/<porta>/   config, database, auth, mailer, ai, scheduler, logger, health, runtime
                      (interface + adaptadores; `database` guarda só o cliente Prisma único)
  app/                telas e rotas; chamam serviços, nunca o Prisma direto
  lib/                utilitários puros compartilhados (datas civis, dinheiro, documentos, iCalendar)
prisma/               migrações versionadas
docs/                 arquitetura, módulos, dados, rotas, testes, deploy, operação e especificações
```

Módulos só se falam pelo `index.ts` de cada um. Jobs são idempotentes (cada alerta tem chave única). Configuração só por variáveis de ambiente, validadas com zod.

## Fora do escopo (roadmap, não codar)

Pix automático, integração com tribunais, WhatsApp automático (API oficial), várias pessoas por conta, app nativo, anexos de arquivos, push (PWA), leitor de intimação com modelo de linguagem.

## Como trabalhar

Método único (Addy Osmani), nesta ordem: `spec-driven-development` → `planning-and-task-breakdown` → `incremental-implementation` com `test-driven-development` → `code-review-and-quality`. Use `source-driven-development` para Next.js, Prisma e Better Auth: consultar a documentação oficial antes de implementar. Não misturar com outros fluxos (Superpowers, Matt Pocock).

- Pronto significa o que está em `.claude/references/definition-of-done.md`.
- Fatias pequenas, um commit por fatia, mensagem em português no imperativo.
- Antes de qualquer PR: rodar testes, lint e `pnpm typecheck`. Usar os agentes `revisor-seguranca-lgpd`, `revisor-de-prazos` e `qa-responsivo` conforme a mudança.
- Não adicionar dependência sem checar licença e custo.

## Divisão da equipe

- **Vitor:** banco, autenticação, prazos, alertas, leitor de intimação.
- **Vini:** telas (dashboard, kanban, clientes, honorários), formulários, arquivos.
- Revisão cruzada em todo pull request. Branch `main` protegida.
