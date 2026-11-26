# Operação

Roteiro para manter o Tempestivo no ar: o que observar, como diagnosticar e o que fazer nos incidentes previsíveis. A publicação em si está em [deploy.md](deploy.md); os critérios seguem [`.claude/references/observability-checklist.md`](../.claude/references/observability-checklist.md).

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

## Incidentes

### Alertas não chegaram

1. Na aba Actions, a última execução de **Jobs agendados** passou? Se falhou com 401, o `JOBS_SECRET` do GitHub difere do da hospedagem. Se nem rodou, lembre que o GitHub desativa o cron de repositório público sem atividade por 60 dias: reative o workflow na aba Actions.
2. No log, `alertas processados` mostra `falhas > 0`? Então o SMTP recusou: veja "E-mails não chegam".
3. `enviados: 0` e `analisados: 0`? Não havia prazo na janela. Os alertas vão só para quem **confirmou o e-mail** da conta: confira isso na tela Conta do usuário.
4. Corrigida a causa, rode o job à mão. Os alertas pendentes saem; os já enviados não se repetem.

### E-mails não chegam

1. `MAILER_DRIVER` está `smtp` na hospedagem? Com `fake`, nada sai.
2. Gmail: a senha precisa ser **senha de app**, com verificação em duas etapas ligada; o limite diário é de cerca de 500 destinatários. Brevo: o remetente precisa estar validado; plano gratuito com 300 e-mails por dia.
3. Mensagens na caixa de spam: configure SPF e DKIM do domínio do remetente no provedor de e-mail.

### O app não sobe

O log de inicialização lista as variáveis inválidas, só pelos nomes:

```text
Configuração inválida. Corrija as variáveis: DATABASE_CA_CERT, APP_URL.
```

Causas comuns: segredo com menos de 32 caracteres; `APP_URL` sem `https` em produção; `DATABASE_CA_CERT` ausente com banco remoto em produção; SMTP sem `SMTP_HOST` ou `EMAIL_REMETENTE` com `MAILER_DRIVER=smtp`. A tabela de cada variável está em [deploy.md](deploy.md).

### `/api/health` responde 503

O app não alcança o banco. Confira se o projeto do Supabase está pausado (plano gratuito pausa por inatividade), se a `DATABASE_URL` aponta para o pooler de transação (porta 6543) e se o certificado em `DATABASE_CA_CERT` está completo. A tabela de problemas em [deploy.md](deploy.md#se-algo-falhar) tem as mensagens de erro de conexão mais comuns.

### Suspeita de vazamento de dados

1. Trate como crítico (ver [SECURITY.md](../SECURITY.md)). Preserve os logs.
2. Troque os segredos (próxima seção) e, se o banco pode ter sido exposto, a senha do banco no Supabase.
3. Se um link de agenda vazou, o titular troca o link em Conta; o anterior para na hora.
4. Avalie o dever de comunicar a ANPD e os titulares (LGPD, art. 48) com quem responde juridicamente pelo serviço.

### Perda do celular e dos códigos

Quem liga a verificação em duas etapas e fica sem o aplicativo entra com um código de recuperação (tela do código, "Estou sem o celular"). Sem o aplicativo **e** sem os códigos, não há botão nem rota que contorne o segundo fator: o atendimento é manual.

1. **Quem atende:** só o responsável pelo serviço (Vitor).
2. **Identidade:** o pedido precisa vir do e-mail da conta. Confirme também por um contato que a pessoa já tinha com você, quando houver (telefone ou mensagem já conhecidos). Nunca por um contato que chegou junto com o pedido. O e-mail sozinho não prova identidade: quem o invadiu poderia fazer o mesmo pedido, e este é o ponto mais fraco do procedimento. Na dúvida, não atenda.
3. **No banco** (em produção, só com a confirmação de quem responde pelo serviço): antes, `select id from "user" where email = 'EMAIL_DO_TITULAR';` precisa devolver exatamente uma linha. Com um e-mail errado, o bloco abaixo termina sem erro e **não faz nada**. Troque `EMAIL_DO_TITULAR` pelo e-mail em minúsculas e rode o bloco inteiro; confira antes que o e-mail não tem aspas simples e, depois, que o último `update` alterou uma linha. O bloco desliga o segundo fator, encerra as sessões, cancela passos pendentes e links, e apaga a senha atual:

```sql
begin;
delete from "twoFactor" where "userId" = (select id from "user" where email = 'EMAIL_DO_TITULAR');
delete from "session" where "userId" = (select id from "user" where email = 'EMAIL_DO_TITULAR');
delete from "verification" where value = (select id from "user" where email = 'EMAIL_DO_TITULAR');
update "account" set password = null
  where "providerId" = 'credential' and "userId" = (select id from "user" where email = 'EMAIL_DO_TITULAR');
update "user" set "twoFactorEnabled" = false where email = 'EMAIL_DO_TITULAR';
commit;
```

4. Peça à pessoa para criar uma senha nova em **Esqueci a senha** e, depois de entrar, ligar de novo a verificação.
5. Registre quando atendeu e como confirmou a identidade, sem copiar dados de clientes.

O teste `src/platform/auth/perda-de-acesso.test.ts` roda esse SQL num banco de teste.

## Troca de segredos

| Segredo | Como trocar | Efeito |
|---|---|---|
| `AUTH_SECRET` | **Leia o aviso abaixo antes.** Novo valor na hospedagem e novo deploy | Encerra todas as sessões **e tranca quem usa a verificação em duas etapas** |
| `JOBS_SECRET` | Mesmo valor novo na hospedagem e nos segredos do GitHub, juntos | Execuções no meio da troca recebem 401 e repetem na próxima |
| Senha do banco | No Supabase (Database > Settings), depois `DATABASE_URL` na hospedagem e `DATABASE_URL_MIGRACAO` no GitHub | Conexões antigas caem |
| Senha SMTP | No provedor de e-mail, depois `SMTP_PASS` | — |

**Aviso sobre o `AUTH_SECRET`:** o segredo do aplicativo autenticador e os códigos de recuperação são cifrados com ele. Depois da troca, o servidor não consegue mais lê-los, e quem usa a verificação não entra nem com código de recuperação. O Better Auth tem segredos com versão (`BETTER_AUTH_SECRETS`), que permitiriam trocar sem esse efeito; o app ainda não os adota nem os testou.

Se a troca for urgente (vazamento), troque o segredo e rode o bloco abaixo (em produção, só com a confirmação de quem responde pelo serviço). Ele apaga a senha de quem usava a verificação: sem isso, essas contas ficariam protegidas só pela senha, que pode ter vazado junto, e quem a tivesse ligaria o próprio segundo fator. Também apaga todas as sessões (voltar ao segredo antigo as faria valer de novo) e tudo o que estava pendente.

```sql
begin;
update "account" set password = null
  where "providerId" = 'credential' and "userId" in (select "userId" from "twoFactor");
update "user" set "twoFactorEnabled" = false where id in (select "userId" from "twoFactor");
delete from "twoFactor";
delete from "session";
delete from "verification";
commit;
```

Depois, avise essas pessoas para criar uma senha nova em **Esqueci a senha** e ligar a verificação de novo. A caixa de e-mail passa a ser a única prova de identidade até lá.

Gere valores novos com `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. Nunca reaproveite um segredo entre ambientes.

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

## Rollback

**Atenção com a verificação em duas etapas:** uma versão anterior a ela não cobra o segundo fator (e ainda abria sessão pelo link de confirmação). Depois que alguém a ligar, voltar a versão faz essa conta entrar só com a senha, sem nenhum erro visível. Prefira corrigir para a frente. Se a volta for inevitável, encerre as sessões, avise quem usa a verificação e volte para a versão nova o quanto antes.

Código: na Vercel, *Instant Rollback* para o deploy anterior. Banco: migrações não têm volta automática. Por isso, mudanças que removem coluna são feitas em duas entregas (ver [modelo-de-dados.md](modelo-de-dados.md#como-mudar-o-esquema)), e qualquer deploy pode voltar uma versão sem quebrar com o esquema atual.
