# Mapa de módulos: Tempestivo

Status: **aprovado** em 28/10/2026 (Vitor). Os ids são estáveis e não mudam durante o projeto. Cada módulo tem a sua especificação `SPEC-<id>.md` na raiz do repositório.

| Módulo (id) | Responsabilidade | Depende de | Dono |
|---|---|---|---|
| `base` | Next.js, Prisma, Docker, CI, configuração, log, portas | — | Vitor |
| `contas-auth` | Cadastro, login, conta, substituto, exportar e excluir dados | base | Vitor |
| `clientes-processos` | Clientes, processos, documentos | contas-auth | Vini |
| `prazos` | Calculadora, prazos, confirmação "li e conferi", status honesto | clientes-processos | Vitor |
| `alertas` | Camadas 5/2/1 dias, e-mail, push, escalada ao substituto, jobs | prazos | Vitor |
| `audiencias` | Audiências, link de rota, arquivo `.ics` | clientes-processos | Vini |
| `honorarios` | Honorários, parcelas, comprovantes, cobrança por `wa.me` | clientes-processos | Vini |
| `kanban-dashboard` | Tarefas e dashboard | prazos, audiencias, honorarios | Vini |
| `intimacao` | Leitor de intimação com IA (só rascunho) | prazos | Vitor |
| `pwa-exportacao` | App instalável, exportar e importar dados | todos | os dois |

## Ordem de construção

`base` → `contas-auth` → `clientes-processos` → `prazos` → (`alertas`, `audiencias`, `honorarios` em paralelo) → `kanban-dashboard` → `intimacao` → `pwa-exportacao`

O `base` é entregue em duas partes (sem mudar o id): **base-A** (projeto, portas, testes, CI) libera a Fase 1 de `prazos`; **base-B** (Prisma, Docker, `/api/health`, cron) libera `contas-auth` e a T8 de `prazos`.

## Regras de dependência

- As setas apontam em uma direção só, sem ciclos.
- O contrato entre dois módulos fica na especificação do módulo que fornece (veja `api-and-interface-design`).
- Um módulo só importa outro pelo `index.ts`.

## Especificações

| Módulo | Arquivo | Estado |
|---|---|---|
| `base` | `SPEC-base.md` | Aprovada em 28/10/2026 (entregas base-A e base-B) |
| `prazos` | `SPEC-prazos.md` | Aprovada em 28/10/2026 (com 3 pendências) |
| demais | — | Ainda não escritas |
