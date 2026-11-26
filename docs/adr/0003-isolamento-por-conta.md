# 0003. Isolar os dados pela conta (contaId)

- **Status:** aceito
- **Registrado em:** 2026-11-18

## Contexto

SaaS com dados pessoais de clientes de advogados (LGPD); vazamento entre contas é o pior incidente possível.

## Decisão

Toda tabela de domínio tem `contaId`; todo método de repositório recebe `contaId` como primeiro parâmetro e filtra por ele, inclusive em `update` e `delete` (`updateMany`/`deleteMany` com `{ id, contaId }`).

## Consequências

Cada módulo tem um teste de que a conta B não lê nem altera dados da conta A. Uma pessoa por conta, por enquanto; várias pessoas por conta está no roadmap.
