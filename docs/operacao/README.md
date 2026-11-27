# Operação

Roteiro para manter o Tempestivo no ar: o que observar, como diagnosticar e o que fazer nos incidentes previsíveis. A publicação está no [guia de publicação](../guias/publicacao.md).

## Perguntas de plantão

O sistema existe para que nenhum prazo passe sem aviso. As perguntas que importam, e onde está a resposta:

| Pergunta | Sinal | Onde ver |
|---|---|---|
| O app está no ar e falando com o banco? | `GET /api/health` | Navegador, `curl`, monitor externo |
| Os alertas de prazo saíram na última execução? | Log `alertas processados` (`enviados`, `falhas`, `adiados`, `limitados`) e o status da execução | Logs da hospedagem; aba Actions, workflow **Jobs agendados** |
| O agendador está rodando? | Execuções recentes do `jobs.yml` (ver [Jobs](#jobs)) | Aba Actions |
| Alguém está tentando entrar à força? | Log `falha de autenticação` em sequência | Logs da hospedagem |
| A configuração está certa? | O servidor recusa subir e lista as variáveis inválidas | Log de inicialização |

## Saúde

`GET /api/health` faz `SELECT 1` no banco.

- `200 {"status":"ok","banco":"ok"}`: tudo certo.
- `503 {"status":"erro","banco":"erro"}`: o app não alcança o banco.

A resposta nunca traz mensagem interna, host nem string de conexão. Para monitorar de fora sem custo, cadastre a URL num monitor gratuito de disponibilidade (checagem a cada 5 minutos é suficiente). O job `ping` também chama a saúde do banco a cada 2 horas, o que evita a pausa por inatividade do plano gratuito do Supabase.

## Logs

Uma linha JSON por evento, na saída padrão:

```json
{"job":"alertas","nivel":"info","msg":"job concluído","duracaoMs":812,"em":"2026-11-18T12:17:03.120Z"}
```

| Campo | Conteúdo |
|---|---|
| `nivel` | `debug`, `info`, `warn` ou `error`; o mínimo vem de `LOG_LEVEL` (produção: `info`) |
| `msg` | Nome estável do evento, em português |
| `em` | Instante em UTC |
| outros | Contexto: `job`, `duracaoMs`, contadores, códigos de erro |

**Redação:** campos cujo nome contém `senha`, `token`, `secret`, `email`, `cpf`, `nome`, `descricao`, `assunto`, `texto` e afins saem como `[oculto]`. Objetos aninhados além do primeiro nível saem como `[omitido]`. Erros de banco registram só o tipo e o código, porque a mensagem do PostgreSQL pode conter dados do registro. Nunca registre o corpo de requisição nem cabeçalhos de autenticação.

### Eventos

| `msg` | Nível | Significado | Ação |
|---|---|---|---|
| `job iniciado` / `job concluído` | info | Execução de um job, com `duracaoMs` | — |
| `job falhou` | error | O job lançou erro (tipo e código no contexto) | Ver o incidente "Alertas não chegaram" |
| `alertas processados` | info | Resumo: `analisados`, `enviados`, `falhas`, `limitados`, `adiados` | Conferir `falhas` |
| `falha ao enviar alerta` | error | O SMTP recusou um envio; o alerta fica para a próxima execução | Ver "Alertas não chegaram" |
| `alertas acima do teto diário por conta` | warn | Uma conta passou de 30 e-mails no dia; o resto fica para amanhã | Investigar a conta: cadastro em massa ou abuso |
| `alertas adiados para a próxima execução` | warn | A execução atingiu o tempo máximo; o restante vai na próxima | Se for frequente, aumentar a frequência do cron |
| `falha ao enviar a confirmação de e-mail`, `falha ao enviar a redefinição de senha` | error | SMTP indisponível no cadastro ou na recuperação | Ver "E-mails não chegam" |
| `falha ao enviar o aviso de segurança` | error | SMTP indisponível depois de trocar ou redefinir a senha; a ação não é desfeita | Ver "E-mails não chegam" |
| `falha ao invalidar pendências da senha` | error | O banco falhou logo depois de trocar ou redefinir a senha; links antigos vencem em até 1 hora e passos pendentes em até 10 minutos | Conferir o banco |
| `falha de autenticação` | warn | Login, cadastro ou redefinição recusados (sem e-mail no log) | Muitos seguidos do mesmo IP: força bruta, contida pelo limitador |

### Lacunas conhecidas

Não há métricas (taxa, erros, latência por rota), rastreamento distribuído nem identificador de correlação por requisição. Com um único processo e poucos usuários, o log da hospedagem e o resumo dos jobs bastam para o MVP. A evolução é OpenTelemetry com um exportador gratuito, sem acoplar a provedor.

## Jobs

| Job | Rota | Frequência | Idempotência |
|---|---|---|---|
| Alertas de prazo | `POST /api/jobs/alertas` | a cada 2 horas (minuto 17, UTC) | chave única por prazo, camada e data |
| Ping | `POST /api/jobs/ping` | a cada 2 horas | só leitura |

**Frequência real.** O cron pede uma execução a cada 2 horas, mas o GitHub Actions não garante o horário: entre 20/11 e 25/11/2026, os disparos agendados saíram com intervalos de 5 a 12 horas. Como o job envia tudo o que estiver pendente, um atraso adia o e-mail, sem perdê-lo enquanto a execução cair no mesmo dia. Se passar um dia sem execução, rode à mão. Para ter horário garantido, aponte outro agendador gratuito para a mesma rota.

Para rodar à mão: aba Actions → **Jobs agendados** → *Run workflow*, ou:

```bash
curl -fsS -X POST -H "Authorization: Bearer $JOBS_SECRET" "$APP_URL/api/jobs/alertas"
```

Rodar de novo é seguro: alerta já enviado não sai duas vezes.

## Runbooks

| Situação | Roteiro |
| --- | --- |
| Alertas ou e-mails não chegam | [alertas-nao-chegaram.md](runbooks/alertas-nao-chegaram.md) |
| O app não sobe ou o banco não responde | [aplicacao-indisponivel.md](runbooks/aplicacao-indisponivel.md) |
| Uma publicação quebrou o site | [reversao-de-versao.md](runbooks/reversao-de-versao.md) |
| Suspeita de vazamento de dados | [suspeita-de-vazamento.md](runbooks/suspeita-de-vazamento.md) |
| Titular sem o celular e sem os códigos | [perda-do-segundo-fator.md](runbooks/perda-do-segundo-fator.md) |
| Troca de senha de banco, SMTP ou segredo do app | [troca-de-segredos.md](runbooks/troca-de-segredos.md) |

O SQL do runbook de perda do segundo fator é executado por um teste (`src/platform/auth/perda-de-acesso.test.ts`). Os demais roteiros não têm ensaio automatizado.

## Pedidos de titulares (LGPD)

| Pedido | Como atender |
|---|---|
| Acesso e portabilidade | O próprio usuário baixa tudo em Conta → **Exportar os dados** (JSON). A planilha completa é uma conveniência de trabalho e não substitui o JSON, que traz também histórico, conferências e registros |
| Correção | Pelas telas de cadastro |
| Exclusão | O próprio usuário exclui em Conta, com a senha; a exclusão é definitiva e em cascata, inclusive do segundo fator |
| Pedido de um cliente do advogado | O advogado é o controlador desses dados; o Tempestivo, como operador, apoia pelas mesmas ferramentas |

## Backup

O plano gratuito do Supabase não deve ser a única cópia. Confira no painel o que o seu plano oferece e, para ter uma cópia sob seu controle, rode periodicamente, com a conexão do modo sessão:

```bash
pg_dump --format=custom --no-owner "$DATABASE_URL_MIGRACAO" > tempestivo-$(date +%F).dump
```

Guarde o arquivo cifrado e fora do repositório: ele contém dados pessoais. Teste a restauração num banco local (`pg_restore --no-owner -d postgresql://postgres:postgres@localhost:54329/tempestivo_restauro tempestivo-AAAA-MM-DD.dump`) antes de precisar dela.
