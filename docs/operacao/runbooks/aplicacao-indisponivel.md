# Runbook: o app não sobe ou /api/health responde 503

- **Severidade típica:** crítica
- **Dono:** responsável pelo serviço

## Sintoma

O site não abre, responde erro 500 logo após uma publicação, ou `/api/health` responde 503.

## O app não sobe

O log de inicialização lista as variáveis inválidas, só pelos nomes:

```text
Configuração inválida. Corrija as variáveis: DATABASE_CA_CERT, APP_URL.
```

Causas comuns: segredo com menos de 32 caracteres; `APP_URL` sem `https` em produção; `DATABASE_CA_CERT` ausente com banco remoto em produção; SMTP sem `SMTP_HOST` ou `EMAIL_REMETENTE` com `MAILER_DRIVER=smtp`. A tabela de cada variável está em [guia de publicação](../../guias/publicacao.md).

## `/api/health` responde 503

O app não alcança o banco. Confira se o projeto do Supabase está pausado (plano gratuito pausa por inatividade), se a `DATABASE_URL` aponta para o pooler de transação (porta 6543) e se o certificado em `DATABASE_CA_CERT` está completo. A tabela de problemas em [guia de publicação](../../guias/publicacao.md#se-algo-falhar) tem as mensagens de erro de conexão mais comuns.

## Mitigação

Se o problema começou numa publicação, volte à versão anterior seguindo o [runbook de reversão](reversao-de-versao.md).
