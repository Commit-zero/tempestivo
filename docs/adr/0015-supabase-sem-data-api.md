# 0015. Usar o Supabase só como PostgreSQL, com a Data API desligada

- **Status:** aceito
- **Registrado em:** 2026-11-26

## Contexto

O Supabase expõe as tabelas por uma API HTTP própria (Data API). O app não a usa, e as tabelas criadas pelas migrações do Prisma não ligam o *Row Level Security* (RLS).

## Decisão

Usar o Supabase apenas como PostgreSQL e manter a Data API desligada. O isolamento entre contas é feito pela aplicação ([ADR 0003](0003-isolamento-por-conta.md)).

## Consequências

Com a API ligada, quem tivesse a chave pública do projeto poderia alcançar tabelas sem RLS. Religá-la exige antes escrever e testar políticas de RLS para todas as tabelas. A conferência é manual, no painel do Supabase ([guia de publicação](../guias/publicacao.md)).

## Critério de revisão

Necessidade de acessar o banco por fora da aplicação.
