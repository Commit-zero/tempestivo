# 0002. Isolar tudo o que é externo em portas e adaptadores

- **Status:** aceito
- **Registrado em:** 2026-11-18

## Contexto

O plano gratuito de qualquer provedor pode acabar; o projeto exige portabilidade.

## Decisão

Banco, e-mail, agendador, IA, log e saúde ficam atrás de uma interface em `src/platform/`; nada de `@vercel/*`.

## Consequências

Trocar de provedor é escrever um adaptador e mudar uma variável (`MAILER_DRIVER`, `AI_DRIVER`, `DATABASE_URL`). A mesma imagem Docker roda fora da Vercel.
