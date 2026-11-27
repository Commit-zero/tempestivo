# Rodar o projeto na sua máquina

Ao terminar, o app responde em `http://localhost:3000`, com banco e caixa de e-mail locais.

## Pré-requisitos

- Node.js **24.22.1** (ver `.nvmrc`)
- pnpm **12.16.1**. Com o Corepack, que lê a versão do `package.json`, troque `pnpm` por `corepack pnpm` nos comandos
- Docker

## Passos

1. Instale as dependências.

   ```bash
   pnpm install
   ```

2. Crie o arquivo de configuração.

   ```bash
   cp .env.example .env
   ```

3. Preencha `JOBS_SECRET` e `AUTH_SECRET` no `.env` com dois valores diferentes. Rode o comando duas vezes:

   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

4. Suba o PostgreSQL e o Mailpit.

   ```bash
   docker compose up -d
   ```

5. Crie as tabelas.

   ```bash
   pnpm db:aplicar
   ```

6. Inicie o app.

   ```bash
   pnpm dev
   ```

**Resultado esperado:** `http://localhost:3000/api/health` responde `{"status":"ok","banco":"ok"}`.

## Portas locais

| Serviço | Endereço |
| --- | --- |
| App | `http://localhost:3000` |
| PostgreSQL | porta `54329` |
| SMTP do Mailpit | porta `54325` |
| Caixa de entrada do Mailpit | `http://localhost:54380` |

As portas fogem do padrão de propósito, para não disputar com serviços já instalados.

## Primeiro uso

Crie uma conta com dados fictícios. Os e-mails aparecem no Mailpit. Os alertas só saem depois que a conta confirma o e-mail pelo link recebido.

Para disparar os alertas como o agendador faz, troque `<JOBS_SECRET>` pelo valor do seu `.env`:

```bash
curl -X POST -H "Authorization: Bearer <JOBS_SECRET>" http://localhost:3000/api/jobs/alertas
```

> **Só dados fictícios** em desenvolvimento, testes e demonstrações.

## Comandos do projeto

| Comando | O que faz |
| --- | --- |
| `pnpm dev` | servidor de desenvolvimento |
| `pnpm build` / `pnpm start` | build (gera o cliente do Prisma) e servidor de produção |
| `pnpm db:migrar --name <nome>` | cria e aplica uma migração depois de mudar `prisma/schema.prisma` |
| `pnpm db:aplicar` | aplica as migrações pendentes |
| `pnpm lint` | ESLint, com as fronteiras de arquitetura |
| `pnpm typecheck` | tipos do Next e `tsc` |
| `pnpm test` / `pnpm test:cobertura` | testes de unidade e de integração, sem e com cobertura |
| `pnpm e2e` | testes de tela |
| `pnpm imagens` | gera favicon, ícones do app e imagem de compartilhamento a partir do símbolo |
| `pnpm verificar` | lint, tipos, testes e build, nesta ordem |

Os testes estão descritos no [guia de testes](testes.md).

## Problemas comuns

| Sintoma | O que fazer |
| --- | --- |
| `Configuração inválida. Corrija as variáveis: ...` | Preencha as variáveis listadas no `.env` ([referência](../referencia/configuracao.md)) |
| Módulo `@/generated/prisma/client` não encontrado | Rode `pnpm prisma generate` |
| O Playwright não abre o Chromium baixado | Use um navegador instalado: `PLAYWRIGHT_CHANNEL=msedge pnpm e2e` |
| `pnpm verificar` falha com `packages field missing or empty` | O script chama o `pnpm` instalado no sistema, de outra versão. Rode `corepack enable` (no Windows, em um terminal como administrador) ou execute `lint`, `typecheck`, `test` e `build` um a um com `corepack pnpm` |
| Um teste de alertas estoura o tempo | O banco local acumulou contas de execuções anteriores. Use um banco vazio |
