# Regras de contagem de prazo

Registro legível, para o advogado validador, das regras que a calculadora aplica. A fonte de verdade no código é [`dominio/regras.ts`](dominio/regras.ts): os ids e as referências daqui devem ser os mesmos de lá.

**Situação:** nenhuma regra foi validada por advogado. Enquanto uma regra estiver `pendente`:

- toda data calculada mostra o aviso de regras pendentes;
- a data só é salva se o advogado marcar "Conferi esta data final nos autos".

Para validar uma regra, o advogado confere os casos de [`__fixtures__/casos-validados.json`](__fixtures__/casos-validados.json) que a citam, e cada caso recebe `validadoPor` e `validadoEm`. Só então a regra passa a `validada` em `regras.ts`. Nenhum caso validado pode ser alterado para um teste passar.

## Escopo

| Dentro | Fora (a calculadora recusa e pede a data manual) |
|---|---|
| CPC e CLT, em **dias úteis** | Prazos em dias corridos ou em horas |
| TJSP e TRT-2 | Outros tribunais |
| Feriados nacionais, Sexta-feira da Paixão e 9 de julho | Juizados Especiais (Lei 9.099/1995) |
| Suspensão de 20/12 a 20/01 | Intimação tácita cujos 10 dias passam pela suspensão |

## Regras

| Id | Regra | Cível (TJSP) | Trabalhista (TRT-2) | Status |
|---|---|---|---|---|
| R1 | Prazos em dias contam só dias úteis | CPC, art. 219 | CLT, art. 775 | pendente |
| R2 | Exclui-se o dia do começo e inclui-se o do vencimento; a contagem começa no primeiro dia útil seguinte | CPC, art. 224, caput e § 3º | CLT, art. 775, caput | pendente |
| R3 | Começo ou vencimento em dia sem expediente passa para o primeiro dia útil seguinte | CPC, art. 224, § 1º | CLT, art. 775; CPC, art. 224, § 1º | pendente |
| R4 | Os prazos ficam suspensos de 20/12 a 20/01, inclusive | CPC, art. 220 | CLT, art. 775-A | pendente |
| R5 | Prazo em dobro, marcado pelo advogado, dobra os dias antes da contagem | CPC, arts. 180, 183 e 186 | Decreto-Lei 779/1969, art. 1º; CPC, arts. 180, 183 e 186 | pendente |
| R6 | Diário eletrônico: publicação no primeiro dia útil após a disponibilização; o prazo começa no primeiro dia útil após a publicação | Lei 11.419/2006, art. 4º, §§ 3º e 4º; CPC, art. 224, § 2º | Lei 11.419/2006, art. 4º, §§ 3º e 4º | pendente |
| R7 | Intimação eletrônica consultada em dia não útil considera-se feita no primeiro dia útil seguinte | Lei 11.419/2006, art. 5º, §§ 1º e 2º | idem | pendente |
| R8 | Sem consulta em 10 dias corridos do envio, a intimação considera-se feita ao fim desse prazo | Lei 11.419/2006, art. 5º, § 3º | idem | pendente |

## Pontos para o validador decidir

1. **Evento durante a suspensão (R2 e R4).** A calculadora entende que a suspensão impede o prazo de correr, mas não adia o dia do começo: intimação em 20/01, ou em qualquer dia de 20/12 a 20/01, começa a contar em 21/01. Existe leitura minoritária que daria 22/01. Ver C07, C08, C18, C19 e C20.
2. **Consulta da intimação eletrônica (R7 e CPC, art. 231, V).** A calculadora segue a prática do PJe: consulta no dia D, primeiro dia contado em D+1. A leitura literal do art. 231, V somada ao art. 224 daria um dia útil a mais.
3. **Dias da Lei 5.010/1966 no TRT-2.** Carnaval (segunda e terça), quarta e quinta da Semana Santa, 11/08, 01/11 e 08/12 são feriado da Justiça do Trabalho por lei. Hoje a calculadora conta esses dias como úteis (data mais cedo) e avisa citando a lei. Se a regra for validada, passam a ser feriado fixo no TRT-2.
4. **Dias que dependem do tribunal ou do foro.** Carnaval e Quarta-feira de Cinzas no TJSP, Corpus Christi, 28/10 e 25/01 (só na capital) são contados como úteis, com aviso. O advogado cadastra o dia sem expediente quando houver.
5. **Intimação tácita e suspensão (R8).** Quando os 10 dias passam pela suspensão, a calculadora recusa, porque a contagem é controvertida.
