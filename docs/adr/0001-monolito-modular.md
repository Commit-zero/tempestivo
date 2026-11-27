# 0001. Usar um monólito modular, não microsserviços

- **Status:** aceito
- **Registrado em:** 2026-11-18

## Contexto

Equipe de duas pessoas, prazo de um mês, custo zero.

## Decisão

Um único app Next.js, com módulos isolados por `index.ts` e fronteiras impostas pelo lint.

## Consequências

Um deploy e um banco. Extrair um módulo depois exige só trocar a chamada do `index.ts` por um cliente HTTP.
