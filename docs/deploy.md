# Deploy

Dois caminhos, ambos de custo zero. O app só conhece variáveis de ambiente; trocar de hospedagem é trocar variáveis.

> **Estado deste roteiro:** os passos de Vercel e Supabase abaixo ainda **não foram executados** de ponta a ponta. O que está provado é o que o CI roda: build, migrações em Postgres 17, imagem Docker subindo e respondendo em `/api/health`.

## Variáveis de ambiente

A lista completa, com um comentário por variável, está em [`.env.example`](../.env.example). Variável ausente ou inválida derruba a subida com a lista dos nomes (nunca dos valores).

| Variável | Produção |
|---|---|
| `NODE_ENV` | `production` (o Vercel e a imagem Docker já definem) |
| `APP_URL` | URL pública, sem barra no final. Entra nos links dos e-mails e nos cookies |
| `JOBS_SECRET` | 64 caracteres aleatórios. O mesmo valor vai em *Secrets* do GitHub |
| `AUTH_SECRET` | 64 caracteres aleatórios, diferente do anterior. Trocar invalida todas as sessões |
| `DATABASE_URL` | Conexão do app com o Postgres (no Supabase, a do *pooler*) |
| `MAILER_DRIVER` | `smtp` |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_REMETENTE` | Gmail (senha de app) ou Brevo |
| `LOG_LEVEL` | `info` |
| `AI_DRIVER` | `local` |

Gere cada segredo com:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Nunca reutilize um segredo de produção em *Preview*, no CI ou na máquina de desenvolvimento.

## Banco de dados e migrações

O app **nunca** roda migração ao subir. As migrações são um passo separado:

- **GitHub Actions:** workflow manual `Migrar o banco de produção` (`migrar.yml`). Exige digitar `migrar` e usa o segredo `DATABASE_URL_MIGRACAO`, que é a conexão **direta** do banco (no Supabase, a do banco, não a do *pooler*). O job usa o *environment* `producao`: configure revisores obrigatórios nele em *Settings > Environments*.
- **Docker:** `docker run --rm -e DATABASE_URL=... tempestivo-migrador`.

Ordem em toda entrega com mudança de esquema: migrar primeiro, publicar o app depois.

## Agendador (alertas de prazo)

O workflow `Jobs agendados` (`jobs.yml`) chama `/api/jobs/ping` e `/api/jobs/alertas` a cada 2 horas. Cadastre em *Settings > Secrets and variables > Actions*:

| Segredo | Valor |
|---|---|
| `APP_URL` | a mesma URL pública do app |
| `JOBS_SECRET` | o mesmo valor configurado no app |

Sem os dois segredos o job termina com um aviso e não chama nada. Os jobs são idempotentes: repetir uma chamada não duplica e-mail. O `ping` também mantém ativo o banco do plano gratuito, que pausa por inatividade.

## Caminho A: Vercel (Hobby) + Supabase

1. **Repositório.** O plano Hobby do Vercel não faz deploy de repositório privado de organização. Antes de importar, escolha: tornar o repositório público, espelhar a `main` em um repositório pessoal privado, ou usar o caminho B.
2. **Supabase.** Crie um projeto só de produção. Copie a conexão do *pooler* (para `DATABASE_URL` do app) e a conexão direta (para `DATABASE_URL_MIGRACAO` no GitHub).
3. **Migrar.** Rode o workflow `Migrar o banco de produção`.
4. **Vercel.** Importe o repositório (Next.js é detectado sozinho; não há `vercel.json`). Cadastre as variáveis da tabela **antes** do primeiro deploy, em *Production* e *Preview*. Node 24.x.
5. **Conferir.** `GET /api/health` deve responder `{"status":"ok","banco":"ok",...}`. Crie uma conta, cadastre um prazo e rode `Jobs agendados` manualmente para ver o e-mail chegar.

O Hobby é para uso não comercial: serve ao desafio, mas cobrar honorários de clientes reais exige rever o plano.

## Caminho B: imagem Docker

```bash
docker build --target runner   -t tempestivo .
docker build --target migrator -t tempestivo-migrador .
docker run --rm --env-file .env tempestivo-migrador
docker run -d -p 3000:3000 --env-file .env tempestivo
```

A imagem roda sem root, sem gerenciador de pacotes e tem `HEALTHCHECK` em `/api/health`. Coloque um proxy com TLS na frente (Caddy, nginx ou o do provedor).

**Atenção ao proxy:** o limitador de tentativas de login identifica o cliente pelo cabeçalho `X-Forwarded-For`. O proxy precisa **sobrescrever** esse cabeçalho com o IP real; se repassar o que o cliente mandou, o limite pode ser burlado. O Vercel já faz isso.

## Se algo falhar

| Sintoma | Causa provável |
|---|---|
| Toda requisição responde 500 logo após o deploy | Variável faltando ou inválida. O log mostra `Configuração inválida. Corrija as variáveis: ...` |
| `/api/health` responde 503 | O app não alcança o banco: confira `DATABASE_URL` e se o projeto do Supabase está pausado |
| Erro de tabela inexistente | As migrações não foram aplicadas |
| O e-mail de alerta não chega | `MAILER_DRIVER` ficou em `fake`, ou as credenciais SMTP estão erradas (o log registra `falha ao enviar alerta`, sem o endereço) |
| `Jobs agendados` falha com 401 | `JOBS_SECRET` do GitHub diferente do `JOBS_SECRET` do app |
