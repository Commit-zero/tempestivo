# 0005. Tratar a calculadora como domínio puro, que recusa em vez de chutar

- **Status:** aceito
- **Registrado em:** 2026-11-18

## Contexto

Errar um prazo tem consequência grave para o cliente do advogado, e as regras ainda não foram validadas por um advogado.

## Decisão

A calculadora não faz I/O, devolve o passo a passo com a referência legal e recusa (pede data manual) o que está fora do escopo: outros tribunais, Juizado Especial, dias corridos, prazo em horas. Enquanto as regras forem `pendente`, salvar uma data calculada exige a declaração "conferi nos autos".

## Consequências

As regras e a referência legal de cada uma estão em [`regras.md`](../../src/modules/prazos/regras.md). Testes de propriedade cobrem dois anos de calendário.
