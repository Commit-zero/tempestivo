# 0010. Hospedar na Vercel com Supabase, com Docker como saída

- **Status:** aceito
- **Registrado em:** 2026-11-18

## Contexto

Custo zero, região São Paulo, sem acoplar o código.

## Decisão

Vercel Hobby (`gru1`) e Supabase Free usado como PostgreSQL puro, pelo pooler de transação; migrações pelo pooler de sessão a partir do GitHub Actions. Imagem Docker com alvos `runner` e `migrator`, testada no CI.

## Consequências

Ver o [guia de publicação](../guias/publicacao.md). Sair da Vercel é subir a imagem em outro lugar com as mesmas variáveis.
