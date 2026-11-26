# 0009. Entregar a agenda por feed iCalendar, sem integração

- **Status:** aceito
- **Registrado em:** 2026-11-18

## Contexto

O advogado olha o calendário do celular; integrar com as APIs do Google e da Microsoft exige OAuth, revisão de app e, em escala, custo.

## Decisão

Feed `.ics` por URL secreta (256 bits, só o SHA-256 no banco), com conteúdo minimizado: nunca nome de cliente, parte ou assunto.

## Consequências

Funciona em qualquer calendário sem configuração; quem tiver o link vê os vencimentos até ele ser trocado. O contrato do feed está em [rotas e interfaces](../referencia/rotas-e-interfaces.md#contrato-da-agenda).
