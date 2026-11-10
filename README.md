# Tempestivo

Aplicativo web para advogados autônomos: **nunca perder prazo e receber honorário**. Projeto do Startup Challenge UMC 2026 (Mestres da Web). Hoje o repositório tem a base técnica: página inicial, as portas de infraestrutura com versões de teste (fakes), CI e testes. Funcionalidades entram nas próximas fases.

Regras do projeto, arquitetura e método de trabalho estão no [CLAUDE.md](CLAUDE.md). As especificações estão em [SPEC-base.md](SPEC-base.md) e [SPEC-prazos.md](SPEC-prazos.md); o plano da base está em [tasks/plan-base-a.md](tasks/plan-base-a.md).

## Pré-requisitos

- Node.js **24.22.1** (há um `.nvmrc`)
- pnpm **12.16.1**

## Rodando na sua máquina

```bash
pnpm install
cp .env.example .env
```

Abra o `.env` e preencha `JOBS_SECRET` com um valor aleatório de pelo menos 32 caracteres. Para gerar um:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Depois:

```bash
pnpm dev
```

Abra http://localhost:3000. Se faltar ou estiver inválida alguma variável, o servidor encerra e diz quais (só os nomes, nunca os valores).

## Comandos

| Comando | O que faz |
|---|---|
| `pnpm dev` | servidor de desenvolvimento |
| `pnpm build` | build de produção (não precisa de `.env`) |
| `pnpm start` | serve o build; precisa das variáveis do `.env` |
| `pnpm lint` | ESLint, inclusive as fronteiras entre módulos |
| `pnpm typecheck` | gera os tipos do Next e roda o `tsc` |
| `pnpm test` | testes de unidade (Vitest) |
| `pnpm e2e` | testes de tela (Playwright) em 360, 768 e 1280 px |

Antes de abrir um PR, rode `pnpm lint`, `pnpm typecheck` e `pnpm test`.

### Testes de tela (e2e)

Na primeira vez, instale o navegador: `pnpm exec playwright install chromium`. Se a sua máquina bloquear o Chromium baixado (política de Controle de Aplicativo do Windows, por exemplo), use o Edge ou o Chrome instalados:

```bash
PLAYWRIGHT_CHANNEL=msedge pnpm e2e
```

No PowerShell: `$env:PLAYWRIGHT_CHANNEL="msedge"; pnpm e2e`.

## Estrutura

```
src/
  app/                telas e rotas (nunca chamam o banco direto)
  components/         componentes de interface (shadcn/ui)
  modules/<modulo>/   regras de negócio; só o index.ts é público
  platform/<porta>/   config, logger, scheduler, storage, mailer, notifier, ai
e2e/                  testes de tela
tasks/                planos e listas de tarefas
```

Cada porta de `src/platform/` tem interface, versão fake e fábrica. As fronteiras (módulos só se falam pelo `index.ts`, telas não importam o banco, nada exclusivo do Vercel) são impostas pelo lint e provadas em `src/lint/`.

## O que ainda não existe

Banco de dados (PostgreSQL com Prisma), login, imagem Docker e os módulos de negócio chegam na base-B e nas fases seguintes. Sobre hospedagem, veja [DEPLOY-VERCEL.md](DEPLOY-VERCEL.md).
