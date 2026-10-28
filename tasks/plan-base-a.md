# Plano de implementação: módulo `base`, entrega base-A

Baseado em `SPEC-base.md` (aprovada em 28/10/2026). Checklist de execução em `tasks/todo-base-a.md`. Os arquivos `tasks/plan.md` e `tasks/todo.md` são do módulo `prazos` e não são tocados aqui. A entrega base-B terá `tasks/plan-base-b.md` e `tasks/todo-base-b.md`.

## Visão geral

A base-A entrega o projeto Next.js com TypeScript, Tailwind e shadcn/ui, a estrutura de pastas, as sete portas (config, logger, scheduler, storage, mailer, notifier, ai) com adaptadores falsos, as regras de fronteira por lint, Vitest, Playwright e o CI. Não há banco, Docker, `/api/health` nem cron: tudo isso é a base-B.

Fica de fora da base-A, de propósito: `DATABASE_URL` no schema do zod, a pasta `src/platform/database/`, `prisma/`, `Dockerfile`, `docker-compose.yml`, `jobs.yml` e `migrar.yml`.

## Pré-requisitos (fora das tarefas)

| # | Pré-requisito | Dono | Necessário para |
|---|---|---|---|
| P1 | Reabrir o Claude Code para o terminal enxergar Node e pnpm; `node -v` deve dar `v24.22.1` e `pnpm -v` deve dar `12.16.1` | Vitor | A1 em diante |
| P2 | Commit inicial só com a documentação que já existe (`CLAUDE.md`, `.claude/`, `CAPABILITY-MAP.md`, `SPEC-*.md`, `tasks/`), **a pedido do Vitor**, para o diff do projeto gerado ficar limpo | Vitor | A1 (recomendado, não obrigatório) |
| P3 | Repositório **privado** no GitHub com `origin` configurado. O `origin` já existe (`Commit-zero/tempestivo`); falta o Vitor confirmar que é privado | Vitor | A5 e A15 (CI só pode ser verificado com remoto) |
| P4 | Vini convidado na organização e com Node 24.22.1 e pnpm 12.16.1 instalados | Vitor e Vini | A3 e A10 em diante |

## Decisões de arquitetura

- **Teste primeiro no que é lógica** (config, logger, scheduler, fakes, regras de lint): escrever o teste, vê-lo falhar, escrever o código (`test-driven-development`). Para scaffold e configuração, a verificação é o comando rodar.
- **Fatias horizontais aqui são aceitáveis.** O `base` não tem fluxo de usuário; cada tarefa deixa o repositório num estado em que `pnpm lint`, `pnpm tsc --noEmit`, `pnpm test` e `pnpm build` passam.
- **Uma tarefa, um commit**, em português, no imperativo, feito quando o Vitor pedir. Antes de cada commit: `pnpm lint && pnpm tsc --noEmit && pnpm test && pnpm build`.
- **Config é uma função pura mais um cache.** `lerConfig(env)` valida um objeto e é o que os testes usam; `getConfig()` lê `process.env` na primeira chamada e guarda o resultado. O build não chama `getConfig()` (senão o build do CI e do Docker quebraria sem segredos).
- **Drivers só aceitam `fake` na base-A.** Valores reais (`smtp`, `s3`, `gemini`) entram no schema junto com o adaptador real, no módulo que o usar.
- **Redação de segredos no logger por nome de campo**, não por valor, e testada.
- **Fronteiras testadas como código:** a regra de lint é verificada por um teste Vitest que usa a API do ESLint sobre trechos de código, para a regra não quebrar sem aviso.
- **Sem dependência fora da tabela de stack da spec.** Nesta entrega entram: `zod`, `vitest`, `vite-tsconfig-paths`, `@playwright/test` e o que `create-next-app` e `shadcn` trazem.
- **`package.json` e `pnpm-lock.yaml` são pontos de conflito entre Vitor e Vini.** Quem instala dependência faz o PR pequeno e o outro dá `rebase` logo em seguida.

## Lista de tarefas

Os ids usam o prefixo `A` para não colidir com os `T` do plano de `prazos`. Tamanhos: XS (1 arquivo), S (1 a 2), M (3 a 5). Exceção declarada: A1 gera muitos arquivos por scaffold; a verificação é revisar o diff.

### Fase 1: Projeto e ferramentas

**A1. Criar o projeto Next.js e fixar as versões** (M, exceção de arquivos)
- Descrição: antes de rodar, ler `pnpm create next-app --help` e confirmar as flags da spec (`--src-dir`, `--use-pnpm`, como não gerar `AGENTS.md`). Gerar o projeto na raiz, que já tem documentação, sem sobrescrevê-la. Fixar `packageManager`, `engines` e `.nvmrc` como em "Versões fixadas" da spec. Registrar no PR o que o pnpm 12 fez com scripts de instalação de dependências e se avisou algo sobre `pmOnFail`.
- Aceite:
  - `CLAUDE.md`, `.claude/`, `CAPABILITY-MAP.md`, `SPEC-*.md` e `tasks/` continuam idênticos (conferido com `git status`/diff);
  - não existe `AGENTS.md`; `src/app` existe; TypeScript em modo estrito;
  - sem Cache Components e sem React Compiler;
  - `package.json` tem `"packageManager": "pnpm@12.16.1"`, `engines` e `.nvmrc` com `24.22.1`;
  - `pnpm install --frozen-lockfile` passa com o `pnpm-lock.yaml` gerado.
- Verificação: `pnpm install --frozen-lockfile && pnpm lint && pnpm tsc --noEmit && pnpm build`; `pnpm dev` responde em `http://localhost:3000`.
- Depende de: P1 (e P2, recomendado)
- Arquivos: `package.json`, `pnpm-lock.yaml`, `.nvmrc`, `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `src/app/*` (scaffold)
- Se falhar: o `create-next-app` recusa pasta não vazia → gerar numa pasta temporária no scratchpad e mover só os arquivos novos, conferindo cada um.

**A2. Higiene do repositório** (XS)
- Descrição: `.gitignore` e `.gitattributes` conforme RF8.
- Aceite:
  - `git check-ignore -v .env .env.local` mostra que são ignorados; `.env.example` **não** é ignorado;
  - ignorados também: `node_modules`, `.next`, `playwright-report`, `test-results`, `coverage`, `src/generated` (cliente Prisma da base-B) e `.claude/settings.local.json`;
  - `.claude/skills/` e `.claude/agents/` **não** são ignorados;
  - `.gitattributes` força `eol=lf` para `*.sh`, `Dockerfile`, `*.yml`, `*.yaml`, `*.ts`, `*.tsx`, `*.md`;
  - depois de `pnpm build`, `git status` não lista artefatos.
- Verificação: comandos `git check-ignore` e `git status` acima.
- Depende de: A1
- Arquivos: `.gitignore`, `.gitattributes`

**A3. Estrutura de pastas, shadcn/ui e página inicial em português** (S)
- Descrição: rodar `pnpm dlx shadcn@latest init` (base `radix`, sem alterar o que o scaffold fez), adicionar `button`, criar `src/modules/` (com `.gitkeep`) e escrever a página inicial com título e um botão, `<html lang="pt-BR">`.
- Aceite: `components.json`, `src/lib/utils.ts` (`cn`) e `src/components/ui/button.tsx` existem; a página mostra texto em português e o botão; sem rolagem horizontal em 360, 768 e 1280 px.
- Verificação: `pnpm lint && pnpm tsc --noEmit && pnpm build`; conferência visual nas três larguras com as ferramentas do navegador.
- Depende de: A1
- Arquivos: `components.json`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`, `src/components/ui/button.tsx`, `src/lib/utils.ts`, `src/modules/.gitkeep`

**A4. Vitest configurado** (S)
- Descrição: instalar `vitest` e `vite-tsconfig-paths`; `vitest.config.mts` com ambiente `node` e alias `@/`; scripts `test` (`vitest run`) e `test:watch`; primeiro teste real sobre `cn` (A3).
- Aceite: `pnpm test` roda uma vez e termina; o alias `@/` funciona dentro de teste; trocar a asserção por uma errada faz o comando falhar (verificado e revertido).
- Verificação: `pnpm test`.
- Depende de: A1, A3
- Arquivos: `vitest.config.mts`, `package.json`, `pnpm-lock.yaml`, `src/lib/utils.test.ts`

### Checkpoint 1: ferramentas
- [ ] `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm tsc --noEmit`, `pnpm test`, `pnpm build` passam
- [ ] Versões fixadas conferidas (`node -v`, `pnpm -v`) e registradas
- [ ] Revisão cruzada do Vini no PR de A1 (a base de tudo)
- [ ] Vini e Vitor já conseguem trabalhar em paralelo

### Fase 2: Integração contínua

**A5. CI de qualidade** (M)
- Descrição: `.github/workflows/ci.yml` com um job `qualidade` (instalar com `--frozen-lockfile`, lint, `tsc`, testes, build), em `pull_request` e em `push` na `main`. Antes de escrever, consultar a documentação oficial do GitHub Actions e do pnpm 12 para: instalar o pnpm na versão exata do `packageManager`, ler o Node de `.nvmrc` e cachear o armazenamento do pnpm. **Fixação das actions (decisão do Vitor):** tag de versão completa (por exemplo `v4.2.1`, nunca só `v4`) para as da GitHub (`actions/*`) e **hash de commit** para as de terceiros (por exemplo `pnpm/action-setup`), com o hash e a tag de origem em comentário e ambos conferidos na documentação ou no repositório oficial da action. `permissions: contents: read`; `concurrency` cancelando execuções antigas do mesmo PR. Variáveis de ambiente do CI são **valores falsos**, nunca segredos.
- Aceite: PR com mudança trivial fica verde; PR com um teste quebrado de propósito fica vermelho (verificado numa branch descartável); duração do job de qualidade até 4 minutos (meta, o total de CI da spec é 8).
- Verificação: abrir PRs de teste no repositório privado.
- Depende de: A4, P3
- Arquivos: `.github/workflows/ci.yml`

### Fase 3: Núcleo das portas (teste primeiro)

**A6. Porta `config`** (M)
- Descrição: `zod` instalado; `schemaEnv` com `NODE_ENV`, `APP_URL`, `JOBS_SECRET` (mínimo 32 caracteres), `LOG_LEVEL` (padrão `info`) e os quatro `*_DRIVER` (só `fake`, padrão `fake`); `lerConfig(env)` pura e `getConfig()` com cache; mensagem de erro em português que lista só os **nomes** das variáveis com erro. `.env.example` com todas as variáveis, uma linha de comentário cada.
- Aceite (testes escritos antes):
  - ambiente válido passa;
  - `JOBS_SECRET` com 31 caracteres falha, e a mensagem contém `JOBS_SECRET` e **não** contém o valor informado;
  - variáveis ausentes são todas listadas, não só a primeira;
  - drivers assumem `fake` quando ausentes; valor desconhecido falha;
  - chaves do `.env.example` batem com as do schema (teste de sincronia).
- Verificação: `pnpm vitest run src/platform/config`
- Depende de: A4
- Arquivos: `src/platform/config/env.ts`, `src/platform/config/index.ts`, `src/platform/config/env.test.ts`, `.env.example`, `package.json`

**A7. Validar a configuração ao subir o servidor** (S)
- Descrição: `src/instrumentation.ts` chama `getConfig()` na subida. **Antes**, ler a documentação oficial de instrumentação do Next.js (a spec marca esse ponto como não verificado) e confirmar o nome do arquivo, a função `register` e o que acontece quando ela lança erro. Se a documentação não sustentar o desenho, parar e propor alternativa.
- Aceite: `pnpm start` com `JOBS_SECRET` ausente falha com mensagem em português que nomeia a variável; com `.env` válido sobe; `pnpm build` **sem** `.env` passa.
- Verificação: os três comandos acima, anotando o resultado no PR.
- Depende de: A6
- Arquivos: `src/instrumentation.ts`

**A8. Porta `logger`** (S)
- Descrição: interface `Logger` (spec), `json-logger` (uma linha JSON com `nivel`, `msg`, `em` em ISO e contexto), `fake-logger` (guarda o que recebeu) e fábrica `criarLogger(config)`.
- Aceite (testes primeiro): uma linha por chamada, JSON válido; mensagens abaixo de `LOG_LEVEL` não saem; `filho(ctx)` mistura o contexto; campos cujo nome indique segredo (`senha`, `password`, `token`, `secret`, `authorization`, `cookie`, `database_url`) saem como `"[oculto]"`, inclusive aninhados em um nível; o fake guarda as chamadas.
- Verificação: `pnpm vitest run src/platform/logger`
- Depende de: A6
- Arquivos: `src/platform/logger/logger.ts`, `json-logger.ts`, `fake-logger.ts`, `index.ts`, `json-logger.test.ts`

**A9. Porta `scheduler`** (S)
- Descrição: interface `Scheduler` (`autorizado`, `executar`), adaptador HTTP que compara `Authorization: Bearer <JOBS_SECRET>` em tempo constante (`crypto.timingSafeEqual`, tratando tamanhos diferentes sem lançar erro) e um fake.
- Aceite (testes primeiro): cabeçalho ausente, formato errado, segredo errado e segredo de outro tamanho retornam `false`; segredo certo retorna `true`; `executar` registra início e fim no logger, devolve o resultado, e em caso de erro registra o erro (sem o segredo) e relança.
- Verificação: `pnpm vitest run src/platform/scheduler`
- Depende de: A6, A8
- Arquivos: `src/platform/scheduler/scheduler.ts`, `scheduler-http.ts`, `fake-scheduler.ts`, `index.ts`, `scheduler.test.ts`

### Checkpoint 2: núcleo
- [ ] Todos os testes passam; `tsc`, lint e build limpos; CI verde
- [ ] `revisor-seguranca-lgpd` sem achados críticos ou altos em config, logger e scheduler
- [ ] Nenhum valor de segredo aparece em mensagem de erro nem em log (conferido nos testes)
- [ ] Revisão cruzada do Vini

### Fase 4: Demais portas (tarefas independentes entre si)

Mesmo molde: interface, fake que guarda o que recebeu, fábrica `criarX(config)` que devolve o fake para `fake` e teste. Cada uma é uma tarefa pequena e pode ir para um desenvolvedor diferente.

**A10. Porta `storage`** (S)
- Aceite (teste primeiro): `salvar` + `linkTemporario` devolve um link que contém a chave; `linkTemporario` com validade menor ou igual a zero lança erro; `remover` apaga e o link seguinte falha; fábrica devolve o fake com `STORAGE_DRIVER=fake`.
- Verificação: `pnpm vitest run src/platform/storage`
- Depende de: A6
- Arquivos: `src/platform/storage/storage.ts`, `fake-storage.ts`, `index.ts`, `fake-storage.test.ts`

**A11. Porta `mailer`** (S)
- Aceite (teste primeiro): `enviar` guarda o e-mail em `enviados`; e-mail sem destinatário ou sem assunto lança erro; fábrica devolve o fake.
- Verificação: `pnpm vitest run src/platform/mailer`
- Depende de: A6
- Arquivos: `src/platform/mailer/mailer.ts`, `fake-mailer.ts`, `index.ts`, `fake-mailer.test.ts`

**A12. Porta `notifier`** (S)
- Aceite (teste primeiro): `notificar` guarda a notificação; `contaId` ou `usuarioId` vazio lança erro (regra 3: tudo pertence a uma conta); fábrica devolve o fake.
- Verificação: `pnpm vitest run src/platform/notifier`
- Depende de: A6
- Arquivos: `src/platform/notifier/notifier.ts`, `fake-notifier.ts`, `index.ts`, `fake-notifier.test.ts`

**A13. Porta `ai` (`Extrator`)** (S)
- Aceite (teste primeiro): `extrair` devolve a resposta programada no fake e guarda o texto recebido; texto vazio lança erro; a saída é `unknown` (validação por zod fica com quem chama); fábrica devolve o fake.
- Verificação: `pnpm vitest run src/platform/ai`
- Depende de: A6
- Arquivos: `src/platform/ai/extrator.ts`, `fake-extrator.ts`, `index.ts`, `fake-extrator.test.ts`

### Checkpoint 3: portas completas
- [ ] As sete portas existem com interface, fake, fábrica e teste
- [ ] `pnpm test` com todos os testes passando; CI verde
- [ ] Revisão cruzada do Vini

### Fase 5: Fronteiras e e2e

**A14. Fronteiras impostas por lint** (M)
- Descrição: regras `no-restricted-imports` no `eslint.config.mjs` (RF9), sem dependência nova. Teste Vitest que usa a API do ESLint (`lintText` com `filePath`) para provar cada regra.
- Aceite (testes escritos antes, falhando sem a regra):
  - arquivo fora de módulo importando `@/modules/prazos/servico` falha; importando `@/modules/prazos` passa;
  - arquivo em `src/app` importando `@prisma/client`, `@/generated/...` ou `@/platform/database` falha;
  - qualquer arquivo importando `@vercel/algo` falha;
  - importação relativa entre módulos diferentes (`../../prazos/servico`) também falha; se a regra do núcleo do ESLint não conseguir cobrir isso, **parar e perguntar** em vez de adicionar plugin (dependência nova é "Ask first").
- Verificação: `pnpm vitest run src/lint && pnpm lint`
- Depende de: A4
- Arquivos: `eslint.config.mjs`, `src/lint/fronteiras.test.ts`

**A15. Playwright e e2e no CI** (M)
- Descrição: instalar `@playwright/test` e o Chromium; `playwright.config.ts` com três projetos (`mobile` 360, `tablet` 768, `desktop` 1280, todos Chromium); `webServer` com `pnpm dev` e `reuseExistingServer: !process.env.CI` localmente e `pnpm start` no CI (build feito antes); `env` do servidor com valores falsos. Teste `e2e/home.spec.ts`. Script `pnpm e2e`. Novo job `e2e` no `ci.yml`, com `playwright install --with-deps chromium` e relatório anexado só quando falha.
- Aceite: a página inicial carrega, mostra o título em português, o botão fica visível e `scrollWidth <= clientWidth` nas três larguras; deixar a página propositalmente larga (verificado e revertido) faz o teste falhar; job `e2e` verde no PR; CI total até 8 minutos.
- Verificação: `pnpm e2e`; PR no repositório privado.
- Depende de: A3, A6, A7, A5
- Arquivos: `playwright.config.ts`, `e2e/home.spec.ts`, `package.json`, `.github/workflows/ci.yml`

### Checkpoint 4: pronto para o CI completo
- [ ] `pnpm e2e` passa nas três larguras; o job `e2e` do CI está verde
- [ ] Tempo total do CI dentro de 8 minutos
- [ ] `qa-responsivo` sem falhas na página inicial nas três larguras

### Fase 6: Documentação e fechamento

**A16. README e percurso de máquina limpa** (S)
- Descrição: `README.md` curto em português: o que é o projeto, pré-requisitos (Node 24.22.1, pnpm 12.16.1), `pnpm install`, copiar `.env.example` para `.env`, `pnpm dev`, tabela de comandos, estrutura de pastas, ponteiro para `CLAUDE.md` e para as specs, e a nota de que banco e Docker chegam na base-B.
- Aceite: o Vini, num clone limpo, segue só o README e chega à página rodando em até 10 minutos, anotando onde travou; os comandos do README são os que existem.
- Verificação: teste manual do Vini; `pnpm lint` cobre o resto.
- Depende de: A15
- Arquivos: `README.md`

### Checkpoint final: base-A
- [ ] Critérios de sucesso da base-A em `SPEC-base.md` marcados (um a um, com evidência)
- [ ] `revisor-seguranca-lgpd` sem achados críticos ou altos (config, logger, scheduler, `ci.yml`)
- [ ] Definição de pronto (`.claude/references/definition-of-done.md`) cumprida
- [ ] Revisão cruzada do Vini em todos os PRs
- [ ] `tasks/todo-base-a.md` toda marcada; `CAPABILITY-MAP.md` nota a base-A como concluída
- [ ] Vitor aprova antes de começar o plano da base-B

## Paralelização

| Pode andar junto | Precisa ser sequencial |
|---|---|
| Depois de A1: A2 (Vitor) e A3 (Vini) | A1 antes de tudo |
| Depois do Checkpoint 1: A5 (CI) com A6 a A9 | A6 antes de A7, A8, A9 e A10 a A13 |
| Depois de A6: A10 a A13 (Vini) com A7, A8, A9 (Vitor) | A8 antes de A9 (o scheduler usa o logger) |
| A14 (lint) em paralelo com qualquer tarefa depois de A4 | A7 e A5 antes de A15 |
| Redação do README durante A15 | A15 antes do fechamento de A16 |

Divisão (decidida pelo Vitor em 28/10/2026): **Vitor** A1, A2, A4, A5, A6, A7, A8, A9; **Vini** A3 e A10 a A16 (incluindo A14, fronteiras por lint, e A15, Playwright). A14 e A15 mexem em `eslint.config.mjs`, `package.json` e `ci.yml`, que o Vitor também toca em A5: quem abrir PR primeiro vence, o outro faz `rebase`.

## Datas

- A1 a A5 (Checkpoint 1 e CI) são o mínimo que a Fase 1 de `prazos` exige do `base` ("projeto, TypeScript, Vitest e CI", em `tasks/plan.md`). A janela de `prazos` começa em 03/11/2026.
- **02/11/2026 é feriado nacional (Finados) e cai numa segunda-feira.** Datas decididas pelo Vitor em 28/10/2026: Checkpoint 1 e A5 até **30/10 (sexta)**; base-A completa até **04/11**. O restante da base-A termina em paralelo com a Fase 1 de `prazos`, sem bloqueá-la.

## Riscos e mitigações

| Risco | Impacto | Mitigação |
|---|---|---|
| Terminal do Claude Code não enxerga Node/pnpm | Alto | P1: reabrir a sessão; A1 começa com `node -v` e `pnpm -v` |
| `create-next-app` recusa pasta não vazia ou sobrescreve arquivo existente | Alto | P2 (commit da documentação) e conferência de diff em A1; plano B de gerar em pasta temporária |
| pnpm 12 pede aprovação de scripts de instalação (Next, Playwright) e a instalação "passa" sem rodá-los | Médio | Registrar em A1 o que o pnpm informou; o `pnpm build` e o `pnpm e2e` provam que funciona |
| Docs do pnpm 12 não cobrem Node/`create-next-app`/Prisma | Médio | Verificação prática em A1 e no PR; Prisma só entra na base-B |
| Sem repositório remoto, o CI não pode ser verificado | Alto | P3 antes de A5; se atrasar, A5 e a parte de CI de A15 escorregam, o resto segue |
| Conflito em `package.json`/lockfile entre os dois | Médio | PRs de dependência pequenos e `rebase` imediato do outro |
| Minutos gratuitos do GitHub (cerca de 2.000/mês em privado) | Médio | CI até 8 min por PR; cancelar execuções antigas (`concurrency`); a base-B soma o cron |
| `instrumentation.ts` não se comportar como a spec supõe | Médio | A7 lê a documentação antes e para se não bater |
| Regra de lint não cobre importação relativa entre módulos | Baixo | A14 testa e, se faltar, pergunta antes de adicionar plugin |
| Playwright baixa navegadores (centenas de MB) e atrasa o primeiro uso | Baixo | Avisar o Vini; cache no CI |

## Open questions

Decididas pelo Vitor em 28/10/2026: commit inicial da documentação (P2) feito antes de A1; datas de 30/10 e 04/11; actions fixadas por tag completa (GitHub) e hash (terceiros); divisão Vitor/Vini como acima.

Pendente:
- O Vitor confirma que `Commit-zero/tempestivo` é privado (P3).
- O Vini aceita o convite e instala Node e pnpm (P4).
