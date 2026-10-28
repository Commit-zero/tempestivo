# Spec: módulo `base`

Estado: **aprovada em 28/10/2026 (Vitor)**, com as versões de Node e pnpm fixadas e o tratamento do shadow database incorporados na mesma data. Primeiro módulo da ordem de construção (`CAPABILITY-MAP.md`); não depende de nenhum outro. Dono: Vitor.

## Entregas

O módulo `base` mantém o id do mapa de capacidades. Ele é construído em **duas entregas**, cada uma com plano, tarefas e PR próprios. A divisão é de execução, não de módulo: `base-A` e `base-B` não são ids novos.

| Entrega | Conteúdo | Libera | Meta (proposta) |
|---|---|---|---|
| **base-A** | Projeto Next.js, estrutura, portas com adaptadores falsos, configuração, logger, Vitest, Playwright, lint, `tsc`, CI | Fase 1 de `prazos` (calculadora pura, só precisa de projeto, Vitest e CI) | 02/11/2026 |
| **base-B** | Prisma 7, `docker-compose`, Dockerfile, `/api/health`, rota de job e esqueleto do cron, migrações no CI | Fase 2 de `prazos` (T8), `contas-auth` | 06/11/2026 |

`contas-auth` só começa depois de **base-B**. A Fase 1 de `prazos` pode começar depois de **base-A**. As metas são propostas minhas e dependem de o Node e o pnpm estarem instalados (ver "Ambiente").

## Objetivo

Entregar o esqueleto técnico do Tempestivo: um projeto que sobe, testa, compila e roda em contêiner, com as portas (interfaces) por onde todo serviço externo vai passar. O `base` não tem funcionalidade de produto. Ele existe para que `contas-auth`, `clientes-processos` e `prazos` comecem sem discutir ferramenta, estrutura ou configuração.

Usuários deste módulo: Vitor e Vini (desenvolvedores). Sucesso significa que:

1. uma pessoa nova clona o repositório e roda o app em até 10 minutos, seguindo só o README;
2. `pnpm lint`, `pnpm tsc --noEmit`, `pnpm test` e `pnpm build` passam local e no CI;
3. trocar de hospedagem exige só variáveis de ambiente e, no máximo, um adaptador;
4. nenhum item exige cartão, plano pago ou serviço pago.

### Decisões já tomadas (Vitor, 28/10/2026)

1. **Sem servidor S3 local no `base`.** Ele entra quando um módulo precisar de arquivos (provavelmente SeaweedFS, a verificar na época). O `docker-compose` do `base` tem só Postgres e Mailpit.
2. **Node LTS e pnpm:** o Vitor instala. Nenhum comando que dependa deles roda antes da confirmação dele.
3. **Docker local é desejável, não bloqueante.** O CI constrói a imagem. O banco de desenvolvimento pode ser Postgres do Docker **ou** um projeto gratuito hospedado (Supabase ou Neon). A spec cobre os dois caminhos.
4. **E2E em cada PR**, só Chromium.
5. **`src/platform/database/`** confirmado; `CLAUDE.md` atualizado com a porta `database`.
6. **Adaptadores reais** (SMTP, S3, Gemini) ficam para o primeiro módulo que os usar.
7. **Migrações:** alvo `migrator` no Dockerfile e `prisma migrate deploy` como passo separado no GitHub Actions, **nunca ao subir o app**.
8. **Repositório privado. Cron a cada 2 horas.** A proteção da `main` pode não existir no plano grátis; a revisão cruzada fica como combinado entre os dois.
9. **Sem `AGENTS.md`.**
10. **Divisão em base-A e base-B**, com **Prisma fixado em 7** (`prisma@7` e `@prisma/client@7`), a revisar depois do lançamento do Prisma 8.
11. **Versões fixadas:** Node **24.22.1** e pnpm **12.16.1** (ver "Versões fixadas").
12. **Banco de desenvolvimento:** tentar Docker primeiro; Supabase em projeto separado do de produção só se o Docker não funcionar.
13. **`migrar.yml` manual** (`workflow_dispatch`) aprovado.
14. **Proteção da `main`:** o Vitor confirma em Settings > Branches depois de criar o repositório.
15. **Cron em repositório privado:** verificar a regra de inatividade quando criar o `jobs.yml`.
16. **Prisma 8:** revisar depois de 27/11/2026.

### Premissas restantes (corrija agora ou eu sigo com elas)

1. Windows 11 é o ambiente dos dois; CI e contêiner rodam Linux.
2. **Node 24.22.1** (a Prisma recomenda o 24 e exige 22.18+; o Next.js exige 20.9+) e **pnpm 12.16.1**, fixados em "Versões fixadas".
3. Next.js na versão estável atual (a 16, pelo que a documentação indica), App Router, Turbopack (padrão), **sem** Cache Components e **sem** React Compiler no MVP.
4. Tailwind v4 e shadcn/ui com a base `radix`.
5. ESLint (não Biome), o padrão do `create-next-app`.
6. O `base` entrega interfaces e adaptadores **falsos** das portas. A porta `auth` fica para `contas-auth`.
7. Só Chromium no Playwright, em três larguras (360, 768 e 1280 px).
8. Dados de teste e de desenvolvimento são sempre fictícios, também no banco hospedado (regra 6 do `CLAUDE.md`).

## Fontes consultadas (source-driven-development)

Documentação oficial, consultada em 28/10/2026:

| Tema | Fonte |
|---|---|
| Criar projeto, requisitos (Node 20.9+), ESLint, `next lint` removido no 16 | https://nextjs.org/docs/app/getting-started/installation |
| `output: 'standalone'`, `PORT`/`HOSTNAME`, copiar `public` e `.next/static` | https://nextjs.org/docs/app/api-reference/config/next-config-js/output |
| Docker e exemplo oficial | https://nextjs.org/docs/app/getting-started/deploying e https://github.com/vercel/next.js/tree/canary/examples/with-docker |
| Vitest com Next.js (pacotes, `vitest.config.mts`, limite com Server Components `async`) | https://nextjs.org/docs/app/guides/testing/vitest |
| Playwright com Next.js | https://nextjs.org/docs/app/guides/testing/playwright |
| `webServer` do Playwright | https://playwright.dev/docs/test-webserver |
| shadcn/ui: `pnpm dlx shadcn@latest init`, Tailwind v4 | https://ui.shadcn.com/docs/cli e https://ui.shadcn.com/docs/installation/next |
| Tailwind v4 com Next.js (`@tailwindcss/postcss`) | https://tailwindcss.com/docs/installation/framework-guides/nextjs |
| Prisma 7 com PostgreSQL (`prisma.config.ts`, gerador `prisma-client`, `PrismaPg`, `migrate dev`) | https://www.prisma.io/docs/v7/prisma-orm/add-to-existing-project/postgresql |
| Prisma 8 RC (descartado por ora) | https://www.prisma.io/docs/getting-started/prisma-orm/quickstart/postgresql |
| Instalar pnpm no Windows | https://pnpm.io/installation |
| Mailpit (imagem `axllent/mailpit`, portas 1025 e 8025) | https://mailpit.axllent.org/docs/install/docker/ |
| MinIO arquivado em 25/04/2026 (motivo da decisão 1) | https://github.com/minio/minio |
| GitHub Actions: `schedule` (cron em UTC, mínimo 5 min, atraso possível, só na branch padrão) | https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows |
| GitHub Actions: cobrança e uso incluído | https://docs.github.com/en/billing/managing-billing-for-your-products/managing-billing-for-github-actions/about-billing-for-github-actions |
| pnpm: `packageManager`, `engines`, `devEngines` | https://pnpm.io/package_json |
| pnpm 12: mudanças de lockfile, `--frozen-lockfile`, tag `latest-12`, configurações desconhecidas | https://pnpm.io/blog/releases/12.0 |
| Prisma 7: campos de `datasource` em `prisma.config.ts` (`url`, `shadowDatabaseUrl`; `directUrl` removido) | https://www.prisma.io/docs/orm/v7/reference/prisma-config-reference |
| Prisma 7: shadow database (quando é usado, permissões, `shadowDatabaseUrl`, bancos hospedados) | https://www.prisma.io/docs/orm/v7/prisma-migrate/understanding-prisma-migrate/shadow-database |

**Não verificado** (confirmar na implementação, com a ferramenta instalada):

- nomes exatos das flags do `create-next-app` (`--src-dir`, `--use-pnpm`, opção para não gerar `AGENTS.md`); usar `pnpm create next-app --help`;
- `instrumentation.ts` como ponto de validação do ambiente na subida;
- se o Dockerfile instala o pnpm por `npm i -g` (a página do pnpm não cita Corepack) e se existe imagem `node:24.22.1-slim`;
- valor padrão de `pmOnFail` no pnpm 12 (a página não informa);
- como o pnpm 12 trata scripts de instalação de dependências (aprovação de builds de Next, Prisma, Playwright); as páginas consultadas não cobrem isso, conferir na primeira instalação e registrar o resultado;
- se `actions/setup-node` aceita `node-version-file: .nvmrc` e como instalar o pnpm 12 no CI (a página do pnpm 12 avisa que a tag `latest` ainda apontava para a linha 11);
- como `prisma.config.ts` trata `shadowDatabaseUrl` quando a variável não existe (o `env()` do Prisma lança erro se a variável faltar, até em `prisma generate`; usar `process.env`);
- tag da imagem do Postgres (proposta: 17) e compatibilidade com a versão do Supabase;
- se workflows agendados de **repositório privado** são desativados por inatividade (a documentação só afirma a regra de 60 dias para repositório público);
- planos em que a proteção da `main` está disponível para repositório privado (a página consultada não responde);
- limites atuais dos planos gratuitos do Supabase e do Neon, e se exigem cartão.

**O que a documentação confirmou sobre as suas respostas:**

- O uso incluído do plano GitHub Free é expresso em dinheiro: US$ 12 por mês, o que dá cerca de 2.000 minutos de Linux 2-core a US$ 0,006/min (**cálculo meu**, não está escrito assim). Armazenamento de artefatos: 500 MB.
- O `schedule` roda em UTC, no mínimo a cada 5 minutos, só na branch padrão, e pode atrasar no início da hora. Por isso o cron usa o minuto 17, não o 0.

## Ambiente da máquina (verificado em 28/10/2026)

| Ferramenta | Estado |
|---|---|
| git | 2.55.0 instalado |
| Node | **v24.22.1** em `C:\Program Files\nodejs` (instalado pelo Vitor) |
| pnpm | **12.16.1** em `%APPDATA%\npm` (instalado pelo Vitor, via npm) |
| Docker, Docker Compose | **ausentes**; é a primeira opção para o banco, então instalar antes da base-B |

Conferido em 28/10/2026 com `node -v` e `pnpm -v` nos caminhos padrão. O `PATH` do terminal desta sessão do Claude Code foi carregado antes da instalação e ainda não enxerga os dois; **reabrir o Claude Code** (ou o terminal) antes de começar a implementação. O Claude não instalou nada.

### Banco de desenvolvimento: dois caminhos

O app só conhece `DATABASE_URL`; trocar de caminho é trocar essa variável. **Ordem de preferência: Docker primeiro.** O Supabase (projeto separado do de produção) só entra se o Docker não funcionar na máquina.

| | Caminho 1: Postgres do Docker | Caminho 2: projeto gratuito hospedado (Supabase ou Neon) |
|---|---|---|
| Requer | Docker ou Podman na máquina | Conta gratuita; confirmar se pede cartão (regra 1) |
| Funciona offline | Sim | Não |
| Como | `docker compose up -d` | Criar um projeto **só de desenvolvimento**, diferente do de produção; colar a string em `.env` |
| Cuidados | Volume local; `down -v` apaga | SSL (`sslmode=require`); só dados fictícios; `migrate dev` pode precisar de banco sombra, ver "Shadow database"; plano grátis pode pausar por inatividade |
| CI | Postgres como `service` do GitHub Actions, nos dois casos | idem |

O README documenta os dois. Os testes de unidade não usam banco em nenhum caminho.

### Shadow database (`prisma migrate dev`)

Fatos da documentação do Prisma 7: o `migrate dev` cria e apaga um banco temporário (shadow) para detectar divergência do esquema; `migrate deploy` e `migrate resolve` **não** o usam. Sem `shadowDatabaseUrl`, o usuário do banco precisa poder criar bancos (no PostgreSQL: superusuário ou `CREATEDB`); sem isso, o erro típico é `permission denied to create database`. Alguns provedores hospedados não permitem criar bancos por SQL ou limitam a conta a um banco.

| Situação | O que fazer |
|---|---|
| **Docker local** (caminho preferido) | Usar o usuário `postgres` do contêiner, que é superusuário: o shadow é criado sozinho, sem configuração. O Postgres `service` do CI usa o mesmo usuário |
| **Banco hospedado**, `migrate dev` falha com `permission denied to create database` | (1) **Preferido:** gerar e testar a migração no Postgres do Docker e aplicar no hospedado só com `prisma migrate deploy`, que não usa shadow. (2) Se o Docker não existir: criar um **segundo banco dedicado** (por exemplo, outro projeto gratuito) e apontar `SHADOW_DATABASE_URL` para ele; `prisma.config.ts` passa o valor em `datasource.shadowDatabaseUrl` quando a variável existir |
| **Nunca** | Usar a mesma URL em `url` e `shadowDatabaseUrl` (a documentação avisa que pode apagar todos os dados do banco); usar `prisma db push` para gerar migração que será commitada (serve só para protótipo descartável) |

`SHADOW_DATABASE_URL` é lida só pela CLI do Prisma, em desenvolvimento; não entra no schema do zod do app, não vai para o CI nem para produção. Se o `migrate dev` apresentar qualquer erro de shadow, o Claude para e reporta antes de tentar contornar.

### Conexão para migrações em produção

O `directUrl` do Prisma **foi removido na v7**; só existem `url` e `shadowDatabaseUrl` no `datasource`. Portanto não há `DIRECT_URL`. O `migrar.yml` e o alvo `migrator` recebem em `DATABASE_URL` a **conexão direta** do banco (no Supabase, a do banco, não a do pooler), e o app em execução recebe em `DATABASE_URL` a conexão que o provedor recomendar para aplicação (pooler, se houver). São dois segredos diferentes com o mesmo nome em lugares diferentes: o `secrets` do `migrar.yml` e a variável de ambiente do app.

## Requisitos funcionais

Cada requisito pertence a uma entrega.

| id | Entrega | Requisito | Critério de aceite |
|---|---|---|---|
| RF1 | A | Projeto Next.js + TypeScript + Tailwind + shadcn/ui | `pnpm dev` abre uma página inicial em pt-BR (`<html lang="pt-BR">`); TypeScript em modo estrito; o componente `button` do shadcn renderiza |
| RF2 | A | Estrutura de pastas | Existem `src/modules`, `src/platform/<porta>` (storage, mailer, notifier, ai, scheduler, config, logger) e `src/app`, como no `CLAUDE.md` |
| RF3 | A | Portas com interface, adaptador falso e fábrica | Cada porta exporta interface, fábrica que escolhe o adaptador por variável e adaptador falso em memória usado em teste |
| RF4 | A | Configuração validada com zod | Variável ausente ou inválida derruba a subida com mensagem em português que lista os nomes com erro (nunca os valores); `.env.example` cobre todas as variáveis, com comentário de uma linha |
| RF5 | A | Logger estruturado | Porta `Logger` com níveis; saída JSON de uma linha (`nivel`, `msg`, `em`, contexto); nunca registra senha, token, `JOBS_SECRET` nem `DATABASE_URL` |
| RF6 | A | Vitest e Playwright | `pnpm test` roda testes de exemplo de config, scheduler e logger; `pnpm e2e` roda um teste de exemplo nas três larguras, só Chromium |
| RF7 | A | CI | Em cada PR: lint, `tsc`, testes, build e e2e; qualquer falha deixa o PR vermelho |
| RF8 | A | Repositório limpo | `.gitignore` cobre `.env*` (menos `.env.example`), `node_modules`, `.next`, cliente Prisma gerado, relatórios de teste e `.claude/settings.local.json`; `.gitattributes` força LF; README curto em pt-BR; sem `AGENTS.md` |
| RF9 | A | Fronteiras impostas por lint | ESLint `no-restricted-imports` falha quando (a) um arquivo fora de um módulo importa `@/modules/<x>/<algo além de index>`; (b) `src/app` importa Prisma ou o cliente gerado; (c) qualquer arquivo importa `@vercel/*` |
| RF10 | B | Prisma 7 + PostgreSQL | `prisma@7` e `@prisma/client@7` fixados; `pnpm prisma migrate dev` aplica uma migração inicial sem tabelas de negócio; cliente único em `src/platform/database/`; nada em `src/app` importa o Prisma |
| RF11 | B | `docker-compose` local (opcional) | `docker compose up -d` sobe Postgres e Mailpit com healthcheck e volume; `down -v` apaga tudo; o app roda sem ele se `DATABASE_URL` apontar para um banco hospedado |
| RF12 | B | `GET /api/health` | 200 `{ status: "ok", banco: "ok", versao }`; com banco fora, 503 `{ status: "erro", banco: "erro" }`; sem segredo nem mensagem interna |
| RF13 | B | Rota de job de exemplo | `GET`/`POST /api/jobs/ping` exige `Authorization: Bearer <JOBS_SECRET>` (comparação em tempo constante), faz `SELECT 1`, registra início, fim e erro; 401 sem segredo; idempotente; mantém o banco gratuito ativo |
| RF14 | B | Dockerfile multi-stage | Estágios `deps`, `builder`, `runner` e `migrator`; `runner` usa `output: 'standalone'`, roda como não root, expõe 3000, tem `HEALTHCHECK` em `/api/health` e **não** roda migração; `migrator` tem a CLI do Prisma e executa só `prisma migrate deploy` |
| RF15 | B | Imagem construída no CI | Job que roda `docker build` dos alvos `runner` e `migrator`, aplica a migração num Postgres `service`, sobe o `runner` e verifica `/api/health` 200. Não publica a imagem em nenhum registro |
| RF16 | B | Migração em produção por passo separado | Workflow `migrar.yml`, **manual** (`workflow_dispatch`), roda `prisma migrate deploy` com `DATABASE_URL` de `secrets` (a conexão direta, ver "Conexão para migrações em produção"); nunca é chamado pelo app nem pelo `runner` |
| RF17 | B | Esqueleto do cron | `jobs.yml` com `schedule` `17 */2 * * *` (a cada 2 horas, no minuto 17, UTC) e `workflow_dispatch`; chama só `/api/jobs/ping` com `Authorization: Bearer ${{ secrets.JOBS_SECRET }}` em `${{ secrets.APP_URL }}`; falha se a resposta não for 2xx |
| RF18 | B | CI estendido | O CI do RF7 ganha o Postgres como `service` e o e2e passa a conferir `/api/health` com `banco: "ok"` |

Mudança em relação à versão anterior: o servidor S3 local saiu; o RF de configuração e o logger passaram a ser da entrega A; `DATABASE_URL` entra no schema do zod só na entrega B, para a entrega A não exigir banco.

### Notas para a base-B (registradas na execução da A1)

- **`sharp` e `next/image`:** o pnpm 12 bloqueia scripts de instalação por `allowBuilds` em `pnpm-workspace.yaml`, e hoje `sharp` e `unrs-resolver` estão como `false`. Se a imagem Docker usar `next/image` em produção, **liberar o `sharp` (`true`) ou evitar o recurso** (por exemplo `images.unoptimized`). Decidir e verificar na tarefa do Dockerfile, com a imagem rodando.
- **Prisma:** os pacotes do Prisma com script de instalação provavelmente precisarão de entrada em `allowBuilds`. Conferir na primeira instalação da base-B e registrar.
- **Tipos no Docker e no CI:** `tsc` exige `pnpm exec next typegen` antes numa pasta limpa.

## Requisitos não funcionais

- **Custo zero:** só ferramentas gratuitas de licença permissiva (MIT, Apache-2.0, BSD). Cada dependência nova é listada no PR com a licença.
- **Orçamento do GitHub Actions (repositório privado):** o cron faz 12 execuções por dia (cerca de 360 por mês) e cada uma deve durar poucos segundos; mesmo contando 1 minuto por execução, fica perto de 360 dos ~2.000 minutos mensais (cálculo meu). O restante vai para o CI. **Meta de CI: até 8 minutos por PR.** Se o consumo passar de 60% do mês, reduzir o e2e ou a frequência do cron.
- **Portabilidade:** nenhum import de `@vercel/*`; nenhuma variável `VERCEL_*` lida fora de um adaptador.
- **Segurança:** `.env` nunca commitado; segredos do CI só em `secrets`; contêiner sem root; `/api/health` e `/api/jobs/*` não vazam detalhes; `JOBS_SECRET` com no mínimo 32 caracteres; o `migrator` é o único alvo com a CLI do Prisma.
- **Português do Brasil** em erros de configuração, README e página inicial; fuso `America/Sao_Paulo` é constante do código.
- **Reprodutibilidade:** `pnpm-lock.yaml` commitado; `pnpm install --frozen-lockfile` no CI e no Docker; Node e pnpm fixados (`engines`, `packageManager`, `.nvmrc`).

## Tech stack

| Camada | Escolha | Licença |
|---|---|---|
| Framework | Next.js 16 (App Router) + React 19 + TypeScript | MIT |
| Estilo | Tailwind v4 + shadcn/ui (base radix) | MIT |
| Banco | PostgreSQL 17 + **Prisma 7** (`prisma@7`, `@prisma/client@7`) + `@prisma/adapter-pg` | Apache-2.0 |
| Validação | zod | MIT |
| Testes | Vitest, Playwright (Chromium) | MIT, Apache-2.0 |
| Lint | ESLint (config do `create-next-app`) | MIT |
| E-mail (dev) | Mailpit | MIT |

**Prisma 8:** não entra. Revisar a decisão **depois de 27/11/2026** e depois do lançamento estável do 8 (guia de migração, mudança de formato do schema). Registrar no roadmap.

### Versões fixadas

Informadas pelo Vitor e conferidas na máquina em 28/10/2026.

| Onde | Valor |
|---|---|
| `package.json` → `packageManager` | `"pnpm@12.16.1"` (versão exata; é o campo que o pnpm 12 usa para fixar) |
| `package.json` → `engines` | `{ "node": ">=24.22.1 <25", "pnpm": ">=12.16.1 <13" }` (em desenvolvimento local, versão fora da faixa dá erro) |
| `.nvmrc` | `24.22.1` |
| Dockerfile | `ARG NODE_VERSION=24.22.1-slim` (tag a confirmar) |
| CI | Node lido de `.nvmrc`; pnpm na versão exata do `packageManager`, nunca `latest` |

Do que a documentação do pnpm 12 diz e afeta o projeto: (a) `--frozen-lockfile` explícito no CI (a forma `--frozen-lockfile false` não existe mais; usar `--no-frozen-lockfile` quando precisar); (b) chave desconhecida em `pnpm-workspace.yaml` vira **erro** quando a versão está fixada, então nada de configuração copiada sem conferir; (c) o primeiro `pnpm install` pode gravar um documento de inicialização no topo do `pnpm-lock.yaml`, e isso é esperado; (d) comandos globais falham sob `sudo`. O que **não** foi coberto: efeito em `create-next-app` e Prisma e aprovação de scripts de instalação (ver "Não verificado"); a primeira tarefa de implementação verifica e registra.

Versões exatas ficam travadas no `package.json` na criação do projeto. Logger próprio, sem dependência (função de ~30 linhas atrás da porta); se ficar insuficiente, trocar por `pino` no adaptador.

## Commands

Válidos depois que cada entrega existir. Em Windows, rodar no PowerShell ou no Git Bash.

**base-A**

```
Instalar:        pnpm install --frozen-lockfile
Dev:             pnpm dev                          # http://localhost:3000
Lint:            pnpm lint
Tipos:           pnpm tsc --noEmit
Teste:           pnpm test                         # vitest run (uma vez, sem watch)
Teste (watch):   pnpm test:watch
E2E:             pnpm e2e                          # playwright test (Chromium)
Build:           pnpm build
Produção local:  pnpm start
Tudo (antes do PR): pnpm lint && pnpm tsc --noEmit && pnpm test && pnpm build
```

**base-B**

```
Serviços locais: docker compose up -d              # Postgres e Mailpit (opcional)
Parar serviços:  docker compose down               # (-v apaga os dados)
Cliente Prisma:  pnpm prisma generate
Migração (dev):  pnpm prisma migrate dev --name <nome>
Migração (prod): pnpm prisma migrate deploy        # só pelo workflow migrar.yml ou pelo alvo migrator
Imagem do app:   docker build --target runner   -t tempestivo .
Imagem migração: docker build --target migrator -t tempestivo-migrador .
Contêiner:       docker run --rm -p 3000:3000 --env-file .env tempestivo
```

O exemplo da documentação do Next.js usa `"test": "vitest"` (modo watch). Aqui `test` roda uma vez, para o CI não travar.

Criação do projeto (**só no turno de implementação**, depois de aprovada a spec e de o Vitor confirmar Node e pnpm), numa pasta que já contém `CLAUDE.md`, `.claude/`, specs e `tasks/`:

```
# base-A
pnpm create next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-pnpm
pnpm dlx shadcn@latest init
pnpm add zod
pnpm add -D vitest vite-tsconfig-paths @playwright/test
pnpm exec playwright install chromium        # no CI (Linux): acrescentar --with-deps

# base-B
pnpm add @prisma/client@7 @prisma/adapter-pg pg
pnpm add -D prisma@7 @types/pg
```

Flags e versões a conferir com `--help` antes de rodar. Se o `create-next-app` gerar `AGENTS.md`, remover antes do commit.

## Project structure

```
src/
  app/
    layout.tsx, page.tsx          página inicial pt-BR                          (A)
    api/health/route.ts           RF12                                          (B)
    api/jobs/ping/route.ts        RF13; só chama o scheduler e o serviço        (B)
  modules/                        vazio no base (cada módulo traz o seu index.ts)
  platform/
    config/        env.ts (schema zod), index.ts (getConfig)                     (A)
    logger/        logger.ts (interface), json-logger.ts, fake-logger.ts         (A)
    storage/       storage.ts (interface), fake-storage.ts, index.ts             (A)
    mailer/        mailer.ts, fake-mailer.ts, index.ts                           (A)
    notifier/      notifier.ts, fake-notifier.ts, index.ts                       (A)
    ai/            extrator.ts (interface Extrator), fake-extrator.ts, index.ts  (A)
    scheduler/     scheduler.ts (verifica o segredo, executa job com log)        (A)
    database/      prisma.ts (cliente Prisma único)                              (B)
  components/ui/                  shadcn
  lib/utils.ts                    cn() do shadcn
e2e/                              testes Playwright
vitest.config.mts, playwright.config.ts, eslint.config.mjs, next.config.ts
.env.example, .gitignore, .gitattributes, .nvmrc, README.md
.github/workflows/ci.yml                                                        (A, estendido na B)
prisma/schema.prisma, prisma/migrations/, prisma.config.ts                      (B)
docker-compose.yml, Dockerfile, .dockerignore                                   (B)
.github/workflows/jobs.yml, migrar.yml                                          (B)
```

Testes de unidade ficam ao lado do código (`*.test.ts`); os e2e em `e2e/`. Não existe pasta ou serviço de armazenamento S3 local.

### Interfaces das portas (contrato mínimo)

Só o que já sabemos que `contas-auth`, `clientes-processos`, `prazos` e `alertas` vão precisar. Extensões entram na spec do módulo que as pedir.

```ts
// platform/logger
export type Contexto = Record<string, string | number | boolean | null>;
export interface Logger {
  debug(msg: string, ctx?: Contexto): void;
  info(msg: string, ctx?: Contexto): void;
  warn(msg: string, ctx?: Contexto): void;
  error(msg: string, ctx?: Contexto): void;
  filho(ctx: Contexto): Logger;
}

// platform/storage  (arquivos privados; entrega por link temporário)
export interface Storage {
  salvar(chave: string, conteudo: Uint8Array, tipo: string): Promise<void>;
  linkTemporario(chave: string, validadeSegundos: number): Promise<string>;
  remover(chave: string): Promise<void>;
}

// platform/mailer
export type Email = { para: string; assunto: string; texto: string; html?: string };
export interface Mailer { enviar(email: Email): Promise<void>; }

// platform/notifier  (o canal; alertas decide quando e para quem)
export type Notificacao = { contaId: string; usuarioId: string; titulo: string; corpo: string; url?: string };
export interface Notifier { notificar(n: Notificacao): Promise<void>; }

// platform/ai  (só rascunho, saída validada por zod no chamador)
export interface Extrator { extrair(texto: string): Promise<unknown>; }

// platform/scheduler  (jobs chamados por HTTP)
export interface Scheduler {
  autorizado(cabecalhos: Headers): boolean;
  executar<T>(nome: string, trabalho: () => Promise<T>): Promise<T>; // loga início, fim e erro
}

// platform/config
export type Config = Readonly<z.infer<typeof schemaEnv>>;
export function getConfig(): Config; // valida na primeira chamada; lança com a lista de erros
```

Todo adaptador falso guarda o que recebeu em memória para o teste inspecionar (`fake.enviados`). A porta `database` não tem interface própria: o Prisma já é a abstração, e só `src/modules/*/repositorio.ts` pode importá-la.

### Variáveis de ambiente (`.env.example`)

| Variável | Entrega | Obrigatória | Observação |
|---|---|---|---|
| `NODE_ENV` | A | sim | `development`, `test`, `production` |
| `APP_URL` | A | sim | URL pública, usada em links de e-mail |
| `JOBS_SECRET` | A | sim | mínimo 32 caracteres |
| `LOG_LEVEL` | A | não | padrão `info` |
| `STORAGE_DRIVER`, `MAILER_DRIVER`, `NOTIFIER_DRIVER`, `AI_DRIVER` | A | não | padrão `fake`; valores reais entram com o adaptador real |
| `DATABASE_URL` | B | sim | Postgres local ou hospedado |
| `SHADOW_DATABASE_URL` | B | não | só desenvolvimento e só lida pela CLI do Prisma (ver "Shadow database"); fora do schema do zod |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_REMETENTE` | com o primeiro módulo que enviar e-mail | só se `MAILER_DRIVER=smtp` | Mailpit local usa `localhost:1025` |

Variáveis de S3, Gemini e Better Auth entram nos módulos que as usam. Validação com `superRefine`: variáveis de um driver só são exigidas quando o driver está ativo.

**Decisão de projeto:** validar no `next build` quebraria o build do Docker e do CI, que não têm segredos reais. `getConfig()` valida de forma preguiçosa na primeira chamada e a subida do servidor chama `getConfig()` (via `instrumentation.ts`, a confirmar); o build não chama.

## Code style

Domínio e nomes de negócio em português; infraestrutura em inglês técnico quando for o padrão (`route`, `adapter`, `env`). Funções pequenas; sem comentário que explica o "o quê".

```ts
// src/platform/config/env.ts
import { z } from 'zod';

const driver = <T extends string>(...opcoes: [T, ...T[]]) =>
  z.enum(opcoes).default(opcoes[0]);

export const schemaEnv = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']),
    APP_URL: z.url(),
    JOBS_SECRET: z.string().min(32, 'precisa ter ao menos 32 caracteres'),
    MAILER_DRIVER: driver('fake', 'smtp'),
    SMTP_HOST: z.string().optional(),
  })
  .superRefine((env, ctx) => {
    if (env.MAILER_DRIVER === 'smtp' && !env.SMTP_HOST) {
      ctx.addIssue({ code: 'custom', path: ['SMTP_HOST'], message: 'obrigatória com MAILER_DRIVER=smtp' });
    }
  });
```

Convenções: `kebab-case` nos arquivos; alias `@/`; sem `any`; `export` nomeado (exceto `page` e `route`, que o Next exige); a mensagem de erro de configuração nunca inclui o valor.

## Testing strategy

- **Vitest (principal), base-A:** ambiente `node`. Exemplos: (1) `schemaEnv` aceita um ambiente válido e rejeita `JOBS_SECRET` curto, listando só o nome da variável; (2) `Scheduler.autorizado` rejeita segredo errado e aceita o certo; (3) o logger JSON não imprime campos sensíveis. React Testing Library e `jsdom` só entram no primeiro módulo que testar componente (a documentação do Next.js avisa que Vitest não cobre Server Components `async`; esses vão para Playwright).
- **Playwright, base-A:** projetos `mobile` (360 px), `tablet` (768 px) e `desktop` (1280 px), só Chromium. Exemplo: a página inicial carrega, mostra o título em português e não tem rolagem horizontal. `webServer` sobe o app (`pnpm build && pnpm start` no CI; `pnpm dev` reaproveitado localmente, com `reuseExistingServer: !process.env.CI`).
- **Saúde, base-B:** o e2e chama `/api/health` e espera `banco: "ok"` (Postgres como `service` no CI).
- **Imagem, base-B:** o job de imagem do CI (RF15) sobe o `runner` e confere `/api/health`. Localmente, quando houver Docker, o mesmo roteiro serve de verificação manual.
- **Lint como teste de arquitetura (RF9):** um arquivo temporário que viola a regra deve falhar o `pnpm lint`; verificado uma vez e registrado no PR.
- **Cobertura:** sem meta numérica; toda lógica do `base` (config, scheduler, logger) tem teste.

Fluxo: `test-driven-development` para config, logger e scheduler (teste primeiro).

## Boundaries

- **Always:** rodar lint, `tsc`, testes e build antes de cada commit; manter `.env.example` igual ao schema do zod; fixar versões; citar a fonte oficial no PR para cada decisão de framework; um commit por fatia, em português, no imperativo; revisão cruzada do Vini em todo PR, mesmo sem proteção da `main`.
- **Ask first:** adicionar dependência fora da tabela de stack; mudar o esquema do banco; mudar o CI, o cron ou o `migrar.yml`; instalar algo global na máquina; trocar versão maior (Next, Prisma, Node); criar conta em serviço hospedado.
- **Never:** commitar `.env` ou segredo; usar `@vercel/*`, KV, Blob ou Edge Config; rodar o contêiner como root; rodar migração ao subir o app; imprimir segredo ou string de conexão em log ou erro; usar dado real de cliente em qualquer banco de desenvolvimento; desligar regra de lint para passar; remover teste falhando; criar tabela de negócio no `base`; commitar sem pedido explícito; publicar a imagem em registro.

## Success criteria

**base-A**

- [ ] Em máquina limpa, README → app rodando em até 10 minutos (testado por Vini).
- [ ] `pnpm lint`, `pnpm tsc --noEmit`, `pnpm test` e `pnpm build` passam local e no CI.
- [ ] `pnpm e2e` passa nas três larguras, em Chromium, sem rolagem horizontal.
- [ ] Subir com `JOBS_SECRET` curto ou ausente falha com mensagem em português que nomeia a variável e não mostra o valor.
- [ ] Import proibido (módulo interno, Prisma em `src/app`, `@vercel/*`) falha o lint.
- [ ] Não existe `AGENTS.md`; `git status` sem segredos; `.env` não aparece.
- [ ] A Fase 1 de `prazos` consegue começar (projeto, Vitest e CI prontos).

**base-B**

- [ ] `pnpm prisma migrate dev` funciona em pelo menos um dos dois caminhos de banco (Docker ou hospedado) e o outro está documentado no README.
- [ ] `docker compose up -d` (quando houver Docker) deixa Postgres e Mailpit `healthy`.
- [ ] `GET /api/health` devolve 200 com banco no ar e 503 com banco parado, sem vazar detalhe.
- [ ] `/api/jobs/ping` devolve 401 sem segredo ou com segredo errado e 200 com o certo; rodar duas vezes é inofensivo.
- [ ] O job de imagem do CI constrói `runner` e `migrator`, aplica a migração e confere a saúde; o `runner` roda como não root.
- [ ] Nada executa `prisma migrate` ao subir o app; só `migrar.yml` (manual) e o alvo `migrator`.
- [ ] `jobs.yml` dispara a cada 2 horas e falha com resposta não 2xx (testado com `workflow_dispatch`).
- [ ] Todas as dependências têm licença permissiva registrada no PR.
- [ ] Definição de pronto (`.claude/references/definition-of-done.md`) cumprida nas duas entregas, com revisão do Vini e do agente `revisor-seguranca-lgpd` (config, jobs, Dockerfile, workflows).

## Fora do escopo do `base`

Servidor S3 local e adaptador S3, tabelas de negócio, login (Better Auth e Argon2), adaptadores reais de SMTP, S3 e Gemini, PWA, telas além da inicial, deploy na Vercel/Supabase, publicação de imagem em registro, migração automática em produção, proteção da `main`, Prisma 8. Cada um tem o seu módulo ou fica no roadmap.

## Open questions

Sem perguntas de decisão pendentes. Restam verificações com dono e momento definidos:

1. **Reabrir o Claude Code** antes da implementação, para o terminal enxergar Node e pnpm (Vitor).
2. **Proteção da `main`:** confirmar em Settings > Branches depois de criar o repositório (Vitor). Sem proteção, vale o combinado: ninguém faz push direto na `main` e todo PR passa pelo CI e pelo Vini.
3. **Cron em repositório privado:** verificar a regra de inatividade ao criar o `jobs.yml` (base-B, Claude) e deixar o resultado no README.
4. **Docker:** instalar antes da base-B (Vitor); a base-A não precisa dele.
5. **Prisma 8:** revisar depois de 27/11/2026; registrar no roadmap.
6. **Itens de "Não verificado":** cada um é conferido na tarefa que o usa e o resultado vai para o PR.

## Observações sobre o repositório

- `tasks/plan.md` e `tasks/todo.md` são do módulo `prazos`. Cada entrega do `base` tem arquivos próprios: `tasks/plan-base-a.md` e `tasks/todo-base-a.md` (e, depois, `plan-base-b.md` e `todo-base-b.md`).
- A definição de pronto cita skills ausentes em `.claude/skills/`: `code-simplification`, `documentation-and-adrs`, `observability-and-instrumentation`, `shipping-and-launch`. Não bloqueiam o `base`.
- Nenhum commit existe ainda e todos os arquivos estão não rastreados. Nada foi commitado.
