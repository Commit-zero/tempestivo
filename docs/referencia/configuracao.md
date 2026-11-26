# Configuração

Referência das variáveis de ambiente e dos limites definidos no código. A fonte das variáveis é [`src/platform/config/env.ts`](../../src/platform/config/env.ts), e o modelo para copiar é o [`.env.example`](../../.env.example).

A configuração é validada na subida. Variável ausente ou inválida encerra o processo com a lista dos **nomes**, nunca dos valores. Variável vazia conta como ausente.

## Variáveis de ambiente

| Variável | Obrigatória | Padrão | Descrição |
| --- | --- | --- | --- |
| `NODE_ENV` | sim | — | `development`, `test` ou `production` |
| `APP_URL` | sim | — | URL pública do app, usada em links de e-mail e cookies. Em produção exige `https`, exceto em `localhost` |
| `JOBS_SECRET` | sim | — | Segredo das rotas `/api/jobs/*`, com 32 caracteres ou mais |
| `AUTH_SECRET` | sim | — | Segredo das sessões e da cifra do segundo fator, com 32 caracteres ou mais. Antes de trocar, leia o [runbook](../operacao/runbooks/troca-de-segredos.md) |
| `DATABASE_URL` | sim | — | Conexão PostgreSQL (`postgres://` ou `postgresql://`) |
| `DATABASE_POOL_MAX` | não | `5` | Conexões por instância, de 1 a 50 |
| `DATABASE_CA_CERT` | em produção, com banco remoto | — | Certificado PEM da autoridade do banco. Dispensado se a URL usar `sslmode=verify-full` |
| `LOG_LEVEL` | não | `info` | `debug`, `info`, `warn` ou `error` |
| `MAILER_DRIVER` | não | `fake` | `fake` não envia; `smtp` envia |
| `SMTP_HOST` | com `smtp` | — | Servidor SMTP |
| `SMTP_PORT` | não | `587` | Porta SMTP |
| `SMTP_USER` | não | — | Usuário SMTP |
| `SMTP_PASS` | não | — | Senha SMTP |
| `EMAIL_REMETENTE` | com `smtp` | — | Remetente dos e-mails |
| `AI_DRIVER` | não | `local` | Leitor de intimação. Só existe `local` |

Banco remoto, para a validação, é um endereço com domínio que não seja a própria máquina. Um nome sem ponto, como o serviço `banco` do Docker, conta como rede interna.

Gere cada segredo com:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Use valores diferentes em cada ambiente. Os valores de produção estão descritos no [guia de publicação](../guias/publicacao.md#variáveis-de-ambiente).

## Limites de tentativas e de uso

Os limites ficam em memória ([ADR 0011](../adr/0011-limitador-em-memoria.md)): valem por instância e zeram quando ela reinicia.

| Operação | Limite | Contado por |
| --- | --- | --- |
| Login | 5 a cada 15 min (zera quando o login se completa) | IP e e-mail |
| Cadastro | 10 a cada 15 min | IP |
| Pedido de redefinição de senha | 3 a cada 15 min | IP e e-mail |
| Reenvio da confirmação de e-mail | 3 a cada 15 min | usuário |
| Confirmação de senha em ação sensível | 5 a cada 15 min (zera no acerto) | usuário |
| Troca de senha | 5 a cada 15 min e 10 por dia | usuário |
| Senha ao ligar o segundo fator | 5 a cada 15 min | usuário |
| Código ao ligar o segundo fator | 10 a cada 15 min | usuário |
| Senha para gerir o segundo fator | 5 a cada 15 min | usuário |
| Código do segundo fator no login | 15 a cada 15 min | IP |
| Feed da agenda | 60 a cada 15 min | IP |
| Convite a substituto | 3 por dia | conta |
| Download de planilha | 10 por minuto | conta |

Além deles, o segundo fator tem bloqueio gravado no banco (ver a [política de segurança](../../SECURITY.md)), e o job de alertas envia no máximo 30 e-mails por conta por dia.

Outros limites: texto do leitor de intimação com até 20.000 caracteres, honorário com até 60 parcelas e prazo calculado com 1 a 365 dias.

## Validades

| Item | Validade |
| --- | --- |
| Sessão | 7 dias, renovada com o uso (no máximo uma vez por dia) |
| Link de redefinição de senha | 1 hora |
| Link de confirmação de e-mail | 1 dia |
| Cookie de aviso de resultado | 20 segundos |
