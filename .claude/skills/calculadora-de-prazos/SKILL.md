---
name: calculadora-de-prazos
description: Use ao criar, alterar ou testar o cálculo de prazos processuais (CPC e CLT) do Tempestivo: dias úteis, feriados, recesso, prazo em dobro e início da contagem a partir da intimação.
---

# Calculadora de prazos do Tempestivo

O prazo perdido é o pior erro possível no produto. Esta skill define como a calculadora é escrita e testada. **Nenhuma regra entra no código sem teste e sem validação de um advogado.**

## Regra de ouro

- O resultado é sempre um **cálculo auxiliar**. A tela diz "cálculo auxiliar, confira" e mostra o passo a passo.
- Se a regra for duvidosa ou fora do escopo, a função **recusa calcular** e pede o prazo digitado à mão. Nunca chutar.
- Cada regra tem: referência legal, teste, e status `validada` ou `pendente` em `src/modules/prazos/regras.md`. Regra `pendente` não vai para produção.

## Escopo do MVP

Dentro: processo cível (CPC) e trabalhista (CLT), com dias úteis, feriados nacionais e do estado de SP.
Fora: Juizados Especiais, processo penal, prazos em horas, feriados municipais (cadastro manual pelo advogado).

## Regras de partida (conferir na fonte antes de implementar; usar `source-driven-development`)

Estas regras vêm do meu conhecimento e **precisam ser confirmadas na lei e por um advogado** antes de virar `validada`:

1. **Dias úteis.** Prazos processuais contam só dias úteis (CPC art. 219; CLT art. 775).
2. **Início e fim.** Exclui-se o dia do começo e inclui-se o do vencimento (CPC art. 224).
3. **Dia sem expediente.** Início e vencimento só em dia útil com expediente forense; se cair em dia sem expediente, prorroga para o próximo dia útil (CPC art. 224, §§ 1º e 3º).
4. **Recesso.** De 20/12 a 20/01 os prazos ficam suspensos (CPC art. 220).
5. **Prazo em dobro.** Fazenda Pública, Ministério Público e Defensoria Pública (CPC arts. 180, 183 e 186). Em dobro por litisconsórcio com advogados diferentes não vale para processo eletrônico (CPC art. 229, § 2º).
6. **Intimação eletrônica.** Considera-se feita na data da consulta, ou ao fim de 10 dias corridos da disponibilização se ninguém consultar (Lei 11.419/2006, art. 5º, § 3º; CPC art. 231). Publicação no diário eletrônico: considera-se publicada no primeiro dia útil após a disponibilização, e o prazo começa no dia útil seguinte (Lei 11.419/2006, art. 4º, §§ 3º e 4º).
7. **Feriados.** Nacionais fixos e móveis vêm da BrasilAPI com tabela local de reserva. Carnaval, Corpus Christi e outros pontos facultativos **dependem do tribunal**: ficam em calendário editável, nunca presumidos.

## Como implementar

- Função **pura**, sem acesso a banco, relógio ou rede: `calcularPrazo(entrada, calendario)` recebe tudo por parâmetro.
- Datas como **data civil sem hora** (`2026-11-25`), nunca `Date` com fuso. Use uma biblioteca de datas simples ou strings ISO. O fuso `America/Sao_Paulo` só aparece na borda (exibição e alertas).
- Entrada: `dataEvento` (disponibilização ou intimação), `tipoEvento`, `dias`, `tipoContagem` (`uteis` ou `corridos`), `emDobro`, `tribunal`.
- Saída: `{ dataInicio, dataFinal, passos: string[], avisos: string[], regrasAplicadas: string[] }`. Os `passos` são o que a tela mostra em "como contamos".
- O calendário (feriados, recesso, pontos facultativos) é injetado, o que permite testar com calendários fixos.

## Testes (obrigatórios)

- Casos validados ficam em `src/modules/prazos/__fixtures__/casos-validados.json`, cada um com data de entrada, resultado esperado, regra aplicada e **nome de quem validou e quando**.
- Use `test-driven-development`: escreva o caso primeiro. Mínimo de casos: prazo simples, atravessando fim de semana, atravessando feriado, vencimento em sábado, atravessando o recesso, dobro, intimação não consultada em 10 dias.
- Teste de propriedade: o resultado nunca cai em sábado, domingo ou feriado; aumentar `dias` nunca antecipa a data final.
- Mudou a calculadora: rode o agente `revisor-de-prazos`.

## O que nunca fazer

- Calcular no navegador com `new Date()` e fuso local.
- Aceitar prazo da IA sem passar pela confirmação do advogado.
- Esconder a regra aplicada. O advogado precisa ver por que a data saiu assim.
