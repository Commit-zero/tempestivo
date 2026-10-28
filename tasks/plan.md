# Plano de implementação: módulo `prazos`

Baseado em `SPEC-prazos.md` (aprovada em 28/10/2026). Checklist de execução em `tasks/todo.md`.

## Visão geral

Entregar o módulo `prazos` em fatias pequenas: primeiro a calculadora pura (maior risco, não depende de banco), depois dados e serviços, depois as telas. A calculadora pode começar assim que o módulo `base` tiver o projeto e o Vitor funcionando, em paralelo a `contas-auth` e `clientes-processos`.

Janela prevista: 03 a 09/11 (ver cronograma do desafio). Congelar funcionalidades em 17/11.

## Pré-requisitos (fora deste módulo)

| Pré-requisito | Necessário para |
|---|---|
| `base` com pnpm, Next.js, TypeScript, Vitest e CI | T1 em diante |
| `contas-auth` com sessão e `contaId` | T8 em diante |
| `clientes-processos` com tabela e repositório de processos | T8 em diante |
| Nome do advogado validador | T7 e Checkpoint A |

## Decisões de arquitetura

- **Calculadora pura primeiro.** Função sem banco, relógio ou rede; o calendário entra por parâmetro. Permite testar tudo sem infraestrutura e falha cedo no ponto de maior risco.
- **Datas civis como string `AAAA-MM-DD`.** Evita erro de fuso. O fuso só aparece na exibição e nos alertas.
- **Feriados atrás de uma porta** (`FeriadosProvider`): tabela local primeiro (T2), BrasilAPI depois (T17), sem mudar a calculadora.
- **Contrato do serviço definido em T10**, antes das telas. Isso libera o Vini para começar a Fase 3 enquanto o Vitor termina o restante da Fase 2.
- **Regra jurídica só com teste e validação.** `regras.md` guarda a referência legal e o status de cada regra.
- **Tribunais do MVP (provisório):** TJSP e TRT-2.

## Lista de tarefas

### Fase 1: Calculadora (domínio puro)

**T1. Tipos e datas civis** (S)
- Descrição: `DataCivil`, soma de dias, dia da semana, comparação, tudo sem `Date` em fuso local.
- Aceite: soma de dias cruza mês e ano; dia da semana correto para datas conhecidas; entrada inválida é rejeitada.
- Verificação: `pnpm vitest run src/modules/prazos/dominio`
- Depende de: `base`
- Arquivos: `dominio/tipos.ts`, `dominio/datas.ts`, `__tests__/datas.test.ts`

**T2. Calendário injetável** (M)
- Descrição: `Calendario` com feriados nacionais (fixos e móveis), feriados de SP, recesso de 20/12 a 20/01 e dias sem expediente cadastrados. Tabela local para TJSP e TRT-2.
- Aceite: dado um ano de 2026 a 2028, `ehDiaUtil` responde corretamente para feriados fixos, Sexta-feira da Paixão e Corpus Christi (marcados como dependentes do tribunal); recesso é reconhecido; dia sem expediente extra pode ser injetado.
- Verificação: `pnpm vitest run src/modules/prazos/dominio`
- Depende de: T1
- Arquivos: `dominio/calendario.ts`, `dominio/feriados-tabela.ts`, `__tests__/calendario.test.ts`

**T3. Cálculo em dias úteis** (M)
- Descrição: `calcularPrazo` para prazo simples: exclui o dia do começo, inclui o do vencimento, pula fim de semana e feriado.
- Aceite: casos de prazo simples, atravessando fim de semana e atravessando feriado passam; resultado nunca cai em dia não útil.
- Verificação: `pnpm vitest run src/modules/prazos/dominio`
- Depende de: T2
- Arquivos: `dominio/calcular-prazo.ts`, `__tests__/calcular-prazo.test.ts`

**T4. Vencimento em dia sem expediente e recesso** (M)
- Descrição: prorrogação para o próximo dia útil e suspensão de 20/12 a 20/01.
- Aceite: vencimento em sábado vai para segunda; prazo que atravessa o recesso soma os dias suspensos; casos de borda em 31/12 e 20/01.
- Verificação: `pnpm vitest run src/modules/prazos/dominio`
- Depende de: T3
- Arquivos: `dominio/calcular-prazo.ts`, `__tests__/recesso.test.ts`

**T5. Em dobro e tipos de evento** (M)
- Descrição: prazo em dobro marcado pelo advogado; evento de intimação, disponibilização e publicação, incluindo intimação eletrônica não consultada em 10 dias corridos.
- Aceite: cada tipo de evento tem pelo menos um teste; "em dobro" dobra os dias antes da contagem.
- Verificação: `pnpm vitest run src/modules/prazos/dominio`
- Depende de: T4
- Arquivos: `dominio/calcular-prazo.ts`, `__tests__/eventos.test.ts`

**T6. Recusa segura, passos e avisos** (S)
- Descrição: retornar `{ ok: false, motivo }` para entrada fora do escopo; sempre devolver `passos`, `avisos`, `regrasAplicadas`.
- Aceite: tribunal desconhecido, prazo em horas e contagem inválida recusam; todo resultado ok traz passo a passo legível e o aviso "cálculo auxiliar, confira".
- Verificação: `pnpm vitest run src/modules/prazos/dominio`
- Depende de: T5
- Arquivos: `dominio/calcular-prazo.ts`, `__tests__/recusa.test.ts`

**T7. Regras e casos para validação** (S, depende de pessoa)
- Descrição: preencher `regras.md` (referência legal e status `pendente`), montar `casos-validados.json` com pelo menos 15 casos em rascunho e um roteiro de revisão de 1 página para o advogado.
- Aceite: cada regra usada tem referência; os 15 casos cobrem os cenários mínimos da skill; o advogado validador está definido até 02/11.
- Verificação: revisão do Vitor; envio ao advogado.
- Depende de: T6
- Arquivos: `regras.md`, `__fixtures__/casos-validados.json`

**Checkpoint A: calculadora**
- [ ] Testes passam e tipos compilam
- [ ] Agente `revisor-de-prazos` sem achados críticos
- [ ] Casos enviados ao advogado validador
- [ ] Revisão com o Vini antes de seguir

### Fase 2: Dados e serviços

**T8. Modelo, repositório e isolamento** (M)
- Descrição: modelos `Prazo`, `PrazoConferencia` e `PrazoHistorico` no Prisma; repositório com `contaId` obrigatório.
- Aceite: migração aplica e reverte; consultas sempre filtram pela conta; teste prova que a conta B não vê prazos da conta A.
- Verificação: `pnpm prisma migrate dev --name prazos` e `pnpm vitest run src/modules/prazos`
- Depende de: Checkpoint A, `clientes-processos`
- Arquivos: `prisma/schema.prisma`, `repositorio.ts`, `__tests__/repositorio.test.ts`

**T9. Catálogo de tipos de prazo** (M)
- Descrição: catálogo inicial (13 tipos, todos pendentes) e personalização por conta (RF10, parte de dados).
- Aceite: catálogo base carregado por seed; conta pode editar dias de um tipo ou criar um próprio sem afetar outras contas.
- Verificação: `pnpm vitest run src/modules/prazos`
- Depende de: T8
- Arquivos: `catalogo/tipos-de-prazo.ts`, `repositorio.ts`, `__tests__/catalogo.test.ts`

**T10. Serviço: cadastrar prazo** (M)
- Descrição: casos de uso RF1 a RF4 e **contrato público** em `index.ts` (assinaturas que as telas usarão).
- Aceite: cadastro pelo catálogo calcula e grava; recusa gera pedido de data manual; data manual fica marcada; contrato documentado em `index.ts`.
- Verificação: `pnpm vitest run src/modules/prazos`
- Depende de: T9
- Arquivos: `servico.ts`, `index.ts`, `__tests__/servico-cadastro.test.ts`

**T11. Serviço: conferência, cumprido e status honesto** (M)
- Descrição: RF6, RF7 e RF8: `confirmarConferencia`, cumprido e desfazer, "vencido" derivado, texto de status honesto.
- Aceite: conferência grava data, hora e canal; status mostra "sem conferência há N dias" e destaca a partir de 3; vencido é derivado e não gravado.
- Verificação: `pnpm vitest run src/modules/prazos`
- Depende de: T10
- Arquivos: `servico.ts`, `__tests__/servico-conferencia.test.ts`

**T12. Serviço: editar prazo** (S)
- Descrição: RF9: alterar dados que mudam a data final recalcula, zera a conferência e grava histórico.
- Aceite: editar `dias` recalcula e zera `ultimaConferenciaEm`; histórico guarda valor anterior e novo; editar só a descrição não zera.
- Verificação: `pnpm vitest run src/modules/prazos`
- Depende de: T11
- Arquivos: `servico.ts`, `__tests__/servico-edicao.test.ts`

**T17. Feriados via BrasilAPI com reserva local** (S)
- Descrição: adaptador de `FeriadosProvider` com cache; se a API falhar, usa a tabela local.
- Aceite: com a API fora do ar, a calculadora continua funcionando; cache evita chamadas repetidas.
- Verificação: `pnpm vitest run src/modules/prazos`
- Depende de: T10
- Arquivos: `dominio/feriados-provider.ts`, `__tests__/feriados-provider.test.ts`

**Checkpoint B: serviço completo**
- [ ] Todos os testes passam, incluindo isolamento entre contas
- [ ] Agente `revisor-seguranca-lgpd` sem achados críticos ou altos
- [ ] Contrato de `index.ts` revisado pelo Vini

### Fase 3: Telas (Vini pode começar após T10)

**T13. Lista de prazos** (M)
- Descrição: RF5, com filtros (próximos 7 dias, vencidos, por processo, por status), mobile-first.
- Aceite: ordenada por data final; estados vazio, carregando e erro; funciona em 360 px sem rolagem horizontal.
- Verificação: Playwright em 360, 768 e 1280 px.
- Depende de: T10
- Arquivos: `src/app/(app)/prazos/page.tsx`, componentes, teste Playwright

**T14. Novo prazo com prévia do cálculo** (M)
- Descrição: escolher processo e tipo, ver a data final e o passo a passo antes de salvar; opção de digitar data manual.
- Aceite: prévia mostra passos e "cálculo auxiliar, confira"; recusa mostra campo de data manual; alvos de toque de 44 px.
- Verificação: Playwright em 360, 768 e 1280 px.
- Depende de: T10
- Arquivos: `src/app/(app)/prazos/novo/page.tsx`, componentes

**T15. Detalhe do prazo** (M)
- Descrição: confirmar "li e conferi", marcar cumprido e desfazer, editar, ver histórico.
- Aceite: confirmar atualiza o status honesto na hora; editar mostra o aviso de que a conferência será zerada.
- Verificação: Playwright em 360, 768 e 1280 px.
- Depende de: T11, T12
- Arquivos: `src/app/(app)/prazos/[id]/page.tsx`, componentes

**T16. Catálogo editável** (S)
- Descrição: RF10, parte de tela.
- Aceite: editar dias de um tipo e criar tipo próprio, com aviso de que o valor é responsabilidade do advogado.
- Verificação: Playwright em 360, 768 e 1280 px.
- Depende de: T9
- Arquivos: `src/app/(app)/prazos/catalogo/page.tsx`

**Checkpoint C: módulo completo**
- [ ] Agente `qa-responsivo` sem falhas nos três tamanhos
- [ ] Agente `revisor-de-prazos` aprova
- [ ] Casos validados pelo advogado e regras marcadas `validada` (ou prazos continuam como "auxiliar" e sinalizados)
- [ ] Critérios de sucesso da spec marcados
- [ ] Definição de pronto (`.claude/references/definition-of-done.md`) cumprida

## Paralelização

| Pode andar junto | Precisa ser sequencial |
|---|---|
| T13 a T16 (Vini) enquanto Vitor faz T11, T12, T17 | T1 a T6 (calculadora) |
| `contas-auth` e `clientes-processos` enquanto Vitor faz T1 a T7 | Migrações do Prisma (T8) |
| Documentação e casos de teste (T7) | Contrato de `index.ts` (T10) antes das telas |

## Riscos e mitigações

| Risco | Impacto | Mitigação |
|---|---|---|
| Advogado validador sem tempo antes de 17/11 | Alto | Definir o nome até 02/11; mandar os casos em lote já no Checkpoint A; manter o aviso "cálculo auxiliar" |
| Regra de contagem diferente por tribunal | Alto | Escopo só TJSP e TRT-2; recusa segura fora disso |
| Pontos facultativos mudam por portaria | Médio | Dias sem expediente editáveis pelo advogado |
| BrasilAPI fora do ar | Baixo | Tabela local de reserva (T17) |
| Atraso em `clientes-processos` bloqueia a Fase 2 | Médio | Fase 1 independe dele; usar processo fictício em teste se necessário |

## Open questions

- Quem é o advogado validador? (prazo: 02/11)
- Tribunais do MVP: confirmar TJSP e TRT-2.
- Prazo em dobro: confirmar que o advogado marca manualmente.
