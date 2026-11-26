# 0011. Limitar tentativas em memória

- **Status:** aceito
- **Registrado em:** 2026-11-18

## Contexto

Redis ou KV custariam ou acoplariam ao provedor.

## Decisão

Janela deslizante em memória (`src/lib/limitador.ts`), por IP e por e-mail.

## Consequências

O limite vale por instância e depende de o proxy sobrescrever `X-Forwarded-For` (a Vercel faz isso). Evolução: guardar as tentativas no PostgreSQL. Registrado na [política de segurança](../../SECURITY.md).
