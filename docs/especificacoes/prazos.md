# Spec: módulo `prazos`

Estado: **aprovada em 28/10/2026 (Vitor)**, com as pendências marcadas em "Open questions". Depende de `clientes-processos`. Construído antes de `alertas`, `kanban-dashboard` e `intimacao`.

## Objetivo

O advogado autônomo cadastra os prazos dos seus processos, vê o que vence primeiro e registra que conferiu cada prazo. A calculadora **ajuda** a achar a data final, mas a decisão é sempre do advogado.

Usuário: advogado autônomo, com 20 a 200 processos ativos, que consulta o sistema principalmente pelo celular.

Sucesso significa que o advogado:

1. cadastra um prazo comum em menos de 30 segundos;
2. entende por que a data final saiu assim (passo a passo visível);
3. nunca é induzido a confiar cegamente: o status mostra o que ele mesmo confirmou e há quanto tempo.

### Premissas aprovadas

1. O prazo nasce de um processo já cadastrado, com tipo do ato, data do evento (intimação, disponibilização ou publicação) e quantidade de dias.
2. A calculadora cobre só CPC e CLT, em dias úteis, com feriados nacionais e de SP e o recesso de 20/12 a 20/01. Fora disso, ela recusa calcular e pede a data digitada.
3. O advogado pode sempre digitar a data final à mão; o prazo fica marcado como "data manual".
4. Status: `pendente`, `confirmado`, `cumprido`. "Vencido" é derivado (data final passada e não cumprido), não gravado.
5. "Confirmado" significa que o advogado clicou "li e conferi", com data, hora e canal (app ou e-mail) registrados.
6. "Status honesto": prazo pendente ou confirmado mostra "sem conferência há X dias".
7. Feriados vêm da BrasilAPI, com tabela local de reserva.
8. **Catálogo** pré-pronto e editável de tipos de prazo.
9. **Confirmação** por link no e-mail (sem login, token de uso único e com validade) e por botão no app. O link vem do módulo `alertas`; este módulo só expõe `confirmarConferencia`.

### Decisões propostas (aprovar ou corrigir)

- Editar dias, data do evento, tipo de contagem ou "em dobro" **recalcula a data final e zera a confirmação**, exigindo nova conferência.
- O destaque de "sem conferência" aparece a partir de 3 dias sem conferir.

## Requisitos funcionais

| id | Requisito | Critério de aceite |
|---|---|---|
| RF1 | Cadastrar prazo a partir do catálogo | Escolher processo e tipo preenche dias e tipo de contagem; o advogado pode alterar |
| RF2 | Calcular data final com passo a passo | Resultado mostra data inicial, final, lista de passos, regras aplicadas e o aviso "cálculo auxiliar, confira" |
| RF3 | Recusar com segurança | Entrada fora do escopo (tribunal desconhecido, Juizado, prazo em horas) não gera data; a tela pede a data manual |
| RF4 | Digitar data final manual | Prazo fica marcado "data manual" e não é recalculado sem o advogado pedir |
| RF5 | Listar prazos | Filtros: próximos 7 dias, vencidos, por processo, por status. Ordenados por data final |
| RF6 | Confirmar conferência | `confirmarConferencia(contaId, prazoId, via)` grava data, hora e canal; atualiza `ultimaConferenciaEm` |
| RF7 | Status honesto | Prazo mostra "conferido há N dias" ou "sem conferência há N dias"; destaque a partir de 3 dias |
| RF8 | Marcar como cumprido e desfazer | Cumprido sai da lista de pendências; desfazer devolve para pendente |
| RF9 | Editar prazo | Mudança que altera a data final zera a confirmação e registra no histórico |
| RF10 | Catálogo editável | O advogado edita dias de um tipo para a sua conta e cria tipos próprios |

## Requisitos não funcionais

- **Isolamento:** todo método recebe `contaId` e filtra por ele. Teste obrigatório de que a conta B não enxerga prazos da conta A.
- **Datas:** datas civis sem hora (`2026-11-25`). O fuso `America/Sao_Paulo` só aparece na borda.
- **Mobile-first:** lista e confirmação funcionam em 360 px, com alvos de toque de 44 px.
- **Auditoria:** cada conferência e cada alteração de data final fica registrada.
- **Português do Brasil** em todos os textos.

## Tech stack

Next.js (App Router) + TypeScript, Prisma + PostgreSQL, zod, Vitest, Playwright. Biblioteca de datas simples (a decidir na tarefa de calendário; "Ask first" para adicionar dependência). As versões exatas ficam travadas no `package.json` criado pelo módulo `base`.

## Commands

Válidos depois que o módulo `base` existir:

```
Dev:        pnpm dev
Teste:      pnpm vitest run src/modules/prazos
Teste tudo: pnpm test
Tipos:      pnpm typecheck
Lint:       pnpm lint
Migração:   pnpm prisma migrate dev --name <nome>
Build:      pnpm build
```

## Project structure

```
src/modules/prazos/
  index.ts                    API pública do módulo
  dominio/
    tipos.ts                  tipos e DataCivil
    calcular-prazo.ts         função pura
    calendario.ts             feriados, recesso, dias sem expediente
  catalogo/tipos-de-prazo.ts  catálogo inicial
  servico.ts                  casos de uso (cadastrar, confirmar, listar)
  repositorio.ts              acesso ao banco, sempre com contaId
  regras.md                   cada regra: referência legal e status
  __fixtures__/casos-validados.json
  __tests__/
src/app/(app)/prazos/         telas (lista, novo, detalhe)
src/app/api/prazos/           rotas
prisma/schema.prisma          modelos Prazo e PrazoConferencia
```

## Modelo de dados

**Prazo:** `id`, `contaId`, `processoId`, `tipoId` (ou `tipoPersonalizado`), `descricao`, `dias`, `contagem` (`uteis` ou `corridos`), `emDobro`, `tipoEvento`, `dataEvento`, `dataInicio`, `dataFinal`, `origemDataFinal` (`calculada` ou `manual`), `status`, `ultimaConferenciaEm`, `cumpridoEm`, `criadoEm`, `atualizadoEm`.

**PrazoConferencia:** `id`, `contaId`, `prazoId`, `em`, `via` (`app` ou `email`), `usuarioId` (vazio quando for via link).

**PrazoHistorico:** `id`, `contaId`, `prazoId`, `em`, `campo`, `valorAnterior`, `valorNovo`.

## Code style

Nomes de domínio em português; código de infraestrutura em inglês técnico quando for padrão (por exemplo `repository`). Funções de domínio puras.

```ts
export type DataCivil = string; // 'AAAA-MM-DD', sem hora e sem fuso

export type EntradaCalculo = {
  dataEvento: DataCivil;
  tipoEvento: 'intimacao' | 'disponibilizacao' | 'publicacao';
  dias: number;
  contagem: 'uteis' | 'corridos';
  emDobro: boolean;
  tribunal: string;
};

export type ResultadoCalculo =
  | { ok: true; dataInicio: DataCivil; dataFinal: DataCivil;
      passos: string[]; avisos: string[]; regrasAplicadas: string[] }
  | { ok: false; motivo: string }; // recusa segura: pede data manual

export function calcularPrazo(
  entrada: EntradaCalculo,
  calendario: Calendario,
): ResultadoCalculo { /* ... */ }
```

## Catálogo inicial (rascunho, **todos pendentes de validação por advogado**)

Escrito a partir do meu conhecimento, sem conferência em fonte. Nenhum item vai para produção antes de ser marcado `validada` em `regras.md`.

| Tipo | Dias | Contagem | Referência a conferir |
|---|---|---|---|
| Contestação (cível) | 15 | úteis | CPC art. 335 |
| Réplica (cível) | 15 | úteis | CPC art. 351 |
| Apelação | 15 | úteis | CPC art. 1.003, § 5º |
| Agravo de instrumento | 15 | úteis | CPC art. 1.003, § 5º |
| Contrarrazões de recurso | 15 | úteis | CPC art. 1.003, § 5º |
| Embargos de declaração (cível) | 5 | úteis | CPC art. 1.023 |
| Cumprimento de sentença: pagamento | 15 | úteis | CPC art. 523 |
| Impugnação ao cumprimento | 15 | úteis | CPC art. 525 |
| Manifestação sem prazo previsto | 5 | úteis | CPC art. 218, § 3º |
| Recurso ordinário (trabalhista) | 8 | úteis | CLT art. 895 |
| Embargos de declaração (trabalhista) | 5 | úteis | CLT art. 897-A |
| Agravo de petição | 8 | úteis | CLT art. 897 |
| Recurso de revista | 8 | úteis | CLT art. 896 |

## Testing strategy

- **Vitest, domínio (principal):** cada regra tem pelo menos um teste. Casos mínimos: prazo simples, atravessando fim de semana, atravessando feriado, vencimento em sábado, atravessando o recesso, em dobro, intimação não consultada em 10 dias, entrada fora do escopo (recusa).
- **Casos validados:** `__fixtures__/casos-validados.json`, cada caso com entrada, resultado esperado, regra e **quem validou e quando**. Nenhum caso é alterado para fazer teste passar sem nova validação.
- **Propriedades:** o resultado nunca cai em sábado, domingo ou feriado; aumentar `dias` nunca antecipa a data final. (Biblioteca de testes de propriedade: "Ask first".)
- **Integração:** repositório com banco de teste, incluindo o teste de isolamento entre contas.
- **Telas:** Playwright em 360, 768 e 1280 px para lista, cadastro e confirmação.
- **Revisão:** agente `revisor-de-prazos` a cada mudança no módulo; `revisor-seguranca-lgpd` ao mexer em repositório ou rotas.

## Boundaries

- **Always:** rodar testes antes de cada commit; filtrar por `contaId`; mostrar "cálculo auxiliar, confira"; registrar a regra aplicada; escrever o teste primeiro.
- **Ask first:** adicionar dependência; mudar o esquema do banco; incluir um tipo de prazo no catálogo; alterar uma regra já validada.
- **Never:** calcular com `new Date()` em fuso local; usar regra `pendente` em produção; gravar prazo vindo de IA sem confirmação; alterar caso validado para o teste passar; remover teste falhando sem aprovação.

## Success criteria

- [ ] Os 10 requisitos funcionais têm teste automatizado passando.
- [ ] O advogado validador revisou pelo menos 15 casos reais e eles estão em `casos-validados.json` com nome e data.
- [ ] Nenhuma regra `pendente` é usada no caminho de produção.
- [ ] Teste de isolamento entre contas passa.
- [ ] Lista e confirmação funcionam em 360, 768 e 1280 px, sem rolagem horizontal.
- [ ] O passo a passo do cálculo aparece em toda data calculada.
- [ ] `revisor-de-prazos` aprova sem achados críticos.

## Open questions

Respostas de 28/10/2026 ("concordo com todas"):

1. **Advogado validador:** ainda sem nome. **Em aberto.** Tarefa T7 do plano cobra a definição até 02/11. A calculadora é construída antes, mas nenhuma regra vira `validada` sem ele.
2. **Tribunais do MVP:** sem escolha explícita. **Premissa provisória:** TJSP e TRT-2, ajustável na tarefa T2. **Em aberto até confirmar.**
3. **Dias sem expediente extraordinários:** cadastro manual pelo advogado. **Aprovado.**
4. **Editar zera a conferência; destaque de "sem conferência" a partir de 3 dias:** **Aprovado.**
5. **Prazo em dobro:** **premissa provisória:** o advogado marca manualmente; sugestão automática por tipo de parte fica fora do MVP. **Em aberto até confirmar.**
