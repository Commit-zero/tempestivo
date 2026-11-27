# 0006. Usar Better Auth com a API HTTP fechada

- **Status:** aceito
- **Registrado em:** 2026-11-18

## Contexto

Custo zero e dados no nosso banco; os limitadores de tentativa e o aceite dos termos vivem nas Server Actions.

## Decisão

Better Auth com Argon2id (`@node-rs/argon2`), sessão em cookie `HttpOnly`. A rota `/api/auth/*` só aceita os links dos e-mails (redefinição de senha e confirmação); o resto devolve 404.

## Consequências

Ninguém contorna o limitador chamando a API direto. Login social está fora do escopo.
