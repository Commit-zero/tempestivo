# Tarefas: módulo `prazos`

Detalhes, critérios de aceite e verificação de cada tarefa em `tasks/plan.md`.

## Fase 1: Calculadora (domínio puro)
- [ ] T1. Tipos e datas civis (S)
- [ ] T2. Calendário injetável (M)
- [ ] T3. Cálculo em dias úteis (M)
- [ ] T4. Vencimento em dia sem expediente e recesso (M)
- [ ] T5. Em dobro e tipos de evento (M)
- [ ] T6. Recusa segura, passos e avisos (S)
- [ ] T7. Regras e casos para validação (S) — precisa do advogado validador até 02/11

### Checkpoint A: calculadora
- [ ] Testes passam e tipos compilam
- [ ] `revisor-de-prazos` sem achados críticos
- [ ] Casos enviados ao advogado validador
- [ ] Revisão com o Vini

## Fase 2: Dados e serviços
- [ ] T8. Modelo, repositório e isolamento (M)
- [ ] T9. Catálogo de tipos de prazo (M)
- [ ] T10. Serviço: cadastrar prazo e contrato público (M)
- [ ] T11. Serviço: conferência, cumprido e status honesto (M)
- [ ] T12. Serviço: editar prazo (S)
- [ ] T17. Feriados via BrasilAPI com reserva local (S)

### Checkpoint B: serviço completo
- [ ] Todos os testes passam, incluindo isolamento entre contas
- [ ] `revisor-seguranca-lgpd` sem achados críticos ou altos
- [ ] Contrato de `index.ts` revisado pelo Vini

## Fase 3: Telas (Vini pode começar após T10)
- [ ] T13. Lista de prazos (M)
- [ ] T14. Novo prazo com prévia do cálculo (M)
- [ ] T15. Detalhe do prazo (M)
- [ ] T16. Catálogo editável (S)

### Checkpoint C: módulo completo
- [ ] `qa-responsivo` sem falhas em 360, 768 e 1280 px
- [ ] `revisor-de-prazos` aprova
- [ ] Casos validados pelo advogado
- [ ] Critérios de sucesso da spec marcados
- [ ] Definição de pronto cumprida
