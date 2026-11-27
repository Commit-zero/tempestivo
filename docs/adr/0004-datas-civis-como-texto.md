# 0004. Guardar datas civis como texto AAAA-MM-DD

- **Status:** aceito
- **Registrado em:** 2026-11-18

## Contexto

Prazo processual é uma data, não um instante. `Date` com fuso causa erros de um dia na virada de horário e entre servidor (UTC) e usuário (America/Sao_Paulo).

## Decisão

Prazos, vencimentos e dias sem expediente são `char(10)`; o fuso só aparece na borda (`src/lib/datas.ts`). Instantes reais (conferência, envio de e-mail, audiência) continuam `timestamp`.

## Consequências

Comparação de datas é comparação de texto, e a calculadora é pura e testável.
