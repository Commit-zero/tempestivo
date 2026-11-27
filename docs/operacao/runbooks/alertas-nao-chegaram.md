# Runbook: alertas ou e-mails não chegam

- **Severidade típica:** crítica: o produto existe para avisar do prazo
- **Dono:** responsável pelo serviço

## Sintoma

O advogado não recebeu o aviso de um prazo, ou nenhum e-mail do sistema chega.

## Diagnóstico do job de alertas

1. Na aba Actions, a última execução de **Jobs agendados** passou? Se falhou com 401, o `JOBS_SECRET` do GitHub difere do da hospedagem. Se nem rodou, lembre que o GitHub desativa o cron de repositório público sem atividade por 60 dias: reative o workflow na aba Actions.
2. No log, `alertas processados` mostra `falhas > 0`? Então o SMTP recusou: veja "E-mails não chegam".
3. `enviados: 0` e `analisados: 0`? Não havia prazo na janela. Os alertas vão só para quem **confirmou o e-mail** da conta: confira isso na tela Conta do usuário.
4. Corrigida a causa, rode o job à mão. Os alertas pendentes saem; os já enviados não se repetem.

## Diagnóstico do envio de e-mail

1. `MAILER_DRIVER` está `smtp` na hospedagem? Com `fake`, nada sai.
2. Gmail: a senha precisa ser **senha de app**, com verificação em duas etapas ligada; o limite diário é de cerca de 500 destinatários. Brevo: o remetente precisa estar validado; plano gratuito com 300 e-mails por dia.
3. Mensagens na caixa de spam: configure SPF e DKIM do domínio do remetente no provedor de e-mail.

## Rodar o job à mão

Na aba Actions, abra **Jobs agendados** e use *Run workflow*, ou:

```bash
curl -fsS -X POST -H "Authorization: Bearer $JOBS_SECRET" "$APP_URL/api/jobs/alertas"
```

Repetir é seguro: um alerta já enviado não sai de novo.
