# 0007. Disparar jobs idempotentes por HTTP

- **Status:** aceito
- **Registrado em:** 2026-11-18

## Contexto

A Vercel Hobby não oferece cron confiável no plano gratuito, e o app precisa rodar em qualquer lugar.

## Decisão

O GitHub Actions chama `POST /api/jobs/<nome>` a cada 2 horas com `Authorization: Bearer $JOBS_SECRET`, comparado em tempo constante. Cada alerta tem chave única `prazo:camada:data`, reservada no banco antes do envio.

## Consequências

Repetir a chamada não duplica e-mail; qualquer cron que faça POST substitui o GitHub Actions.
