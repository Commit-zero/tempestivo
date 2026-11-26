# Estratégia de testes

Como o Tempestivo é testado, o que cada nível prova e como escrever um teste novo. Os padrões gerais seguem [`.claude/references/testing-patterns.md`](../.claude/references/testing-patterns.md) e a skill `test-driven-development`: o teste vem antes do código, e um bug vira primeiro um teste que falha.

## Pirâmide

| Nível | Ferramenta | Onde | O que prova | Precisa de |
|---|---|---|---|---|
| Domínio | Vitest | `src/modules/*/dominio`, `src/modules/prazos/__tests__`, `src/lib/*.test.ts` | Regras puras: calculadora, meta interna, situação do prazo, camadas de alerta, CNJ, CPF/CNPJ, dinheiro, datas, iCalendar | nada |
| Integração | Vitest | `src/modules/*/*.test.ts`, `src/platform/*/*.test.ts` | Serviço + repositório + banco de verdade; isolamento entre contas; SMTP de verdade; Argon2id real | Postgres e Mailpit (`docker compose up -d`) |
| Arquitetura | Vitest + ESLint | `src/lint/fronteiras.test.ts` | As regras de importação entre camadas e módulos | nada |
| Contraste | Vitest | `src/test/contraste.test.ts` | WCAG 2.2: texto 4,5:1 e componentes 3:1, nos temas claro e escuro, lido de `globals.css` | nada |
| Tela | Playwright | `e2e/*.spec.ts` | Fluxos completos no build de produção, em 360, 768 e 1280 px, mais reflow em 320 px; sem rolagem horizontal; estrutura acessível em todas as rotas | build, Postgres, navegador |
| Imagem | CI (job `imagem`) | `.github/workflows/ci.yml` | A imagem Docker constrói, migra, sobe sem root e responde `/api/health` | Docker |

Não há mocks de módulo. As dependências externas entram como parâmetro e têm adaptadores falsos de verdade (`criarFakeMailer`, `criarFakeLogger`, `criarFakeExtrator`, `fake-scheduler`), e o banco é sempre o PostgreSQL real, porque o isolamento por `contaId` só se prova contra o banco.

## Comandos

```bash
pnpm test                 # unidade + integração
pnpm test:cobertura       # o mesmo, com cobertura e metas mínimas
pnpm vitest run src/modules/prazos      # só uma pasta
pnpm vitest run -t "meta interna"       # só os testes com esse nome
pnpm e2e                  # telas (constrói antes: pnpm build)
pnpm e2e e2e/agenda.spec.ts --project=mobile
PLAYWRIGHT_CHANNEL=msedge pnpm e2e      # quando o Chromium baixado é bloqueado na máquina
pnpm verificar            # lint, tipos, testes e build, na ordem do CI
```

## Cobertura

Metas em `vitest.config.mts`, que falham o CI: **90% das instruções, 85% dos ramos, 90% das funções e 90% das linhas**, medidas sobre `src/modules`, `src/lib` e `src/platform`. Ficam de fora só a montagem do Better Auth (`auth.ts`), a leitura da sessão (`sessao.ts`) e a raiz de composição (`runtime`), que dependem do contexto de requisição do Next e são cobertas pelos testes de tela.

O relatório HTML fica em `coverage/index.html` e é anexado a cada execução do CI (artefato `cobertura`, 14 dias).

Cobertura é piso, não meta: um teste que só passa pelo código sem verificar o resultado não conta.

## Dados de teste

- **Só dados fictícios** (regra 6): nomes como "Maria Cliente Sigilosa", e-mails `@exemplo.test`, números CNJ gerados por `numeroCnjFicticio()`.
- **Integração:** `criarContaDeTeste()` e `apagarContaDeTeste()` (`src/test/banco.ts`) criam uma conta descartável por teste ou por `describe`. Testes podem rodar em paralelo porque cada um usa a própria conta.
- **Relógio fixo:** funções que dependem da data recebem `agora`; os testes usam um instante fixo, como `new Date("2026-11-12T15:00:00Z")` (meio-dia em São Paulo).
- **Ambiente:** `src/test/preparo.ts` carrega o `.env` se existir e completa com valores falsos; força `MAILER_DRIVER=fake`.
- **Autenticação:** `vi.mock("next/headers", () => import("@/test/next-headers"))` simula um navegador com cookies, e o Vitest processa o `better-auth` (`server.deps.inline`) para a simulação valer dentro dele. A simulação não imita um detalhe do Next: depois que uma server action grava um cookie, `cookies()` muda e `headers()` não. Por isso, fluxo que troca a sessão também precisa de teste de tela.
- **Telas:** `e2e/preparo.ts` cria uma conta fictícia uma vez e guarda a sessão em `e2e/.sessao/`; cada largura envia um `X-Forwarded-For` próprio, para não dividir o limite de cadastros por IP.

## Testes que todo módulo deve ter

1. **Isolamento entre contas:** a conta B não lista, não lê por id, não altera e não apaga dados da conta A.
2. **Validação:** entradas inválidas devolvem `{ ok: false, erro }` com mensagem em português.
3. **Caminho feliz** de cada caso de uso público do `index.ts`.

E, quando se aplica:

- **Privacidade:** o que sai do sistema (e-mail, feed, exportação, log) não contém o que não deve. Exemplos: `agenda.test.ts` procura o nome do cliente no feed; `conta.test.ts` procura `tokenHash` na exportação.
- **Idempotência:** jobs rodados duas vezes não duplicam efeito.
- **Propriedade:** para regras de calendário, varrer um intervalo grande em vez de escolher casos. Exemplo: a meta interna nunca cai em dia sem expediente nem em ponto facultativo, de 2026 a 2027.

## Escrevendo um teste

Estrutura arrumar, agir, verificar, com nome que diz o comportamento:

```ts
it("prazo vencido ou cumprido não mostra meta", () => {
  // arrumar: hoje é 12/11/2026, vencimento em 11/11
  const vencido = situacaoDoPrazo({ ...base, dataFinal: "2026-11-11" }, agora, "2026-11-09");
  // verificar
  expect(vencido).toMatchObject({ metaInterna: null, metaChegou: false });
});
```

Nos testes de tela:

- Encontrar elementos pelo papel e pelo nome acessível (`getByRole("button", { name: "Salvar", exact: true })`), nunca por classe CSS. Se o teste não acha o botão pelo nome, o leitor de tela também não acha.
- Chamar `semRolagemHorizontal(page)` em toda tela nova.
- Incluir a rota nova em `e2e/acessibilidade.spec.ts`.
- Verificar o foco depois de ações que mudam a tela (`toBeFocused()`), como nos testes de mover tarefa e de erro do formulário.

## Regras de prazo

A calculadora tem regras próprias (skill `calculadora-de-prazos`):

- Cada regra tem teste com o caso, a data esperada e a referência legal.
- Os casos para o advogado validador ficam em `src/modules/prazos/__fixtures__/casos-validados.json`; uma regra só deixa de ser `pendente` com a validação registrada.
- Mudança em `src/modules/prazos` passa pelo agente `revisor-de-prazos`.

## No CI

O CI roda em todo pull request, inclusive de fork, e em todo push na `main`. `src/lint/workflows.test.ts` confere os gatilhos, a ausência de segredos e as actions fixadas por SHA.

| Job | Testes |
|---|---|
| `qualidade` | lint, tipos, migração pendente, `pnpm test:cobertura` (Postgres 17 e Mailpit como serviços), build |
| `e2e` | `pnpm e2e` contra o build de produção; relatório anexado se falhar |
| `imagem` | constrói e sobe a imagem, confere `/api/health` e o usuário sem root |

No CI, o e2e permite uma nova tentativa por teste, e o relatório marca como instável (*flaky*) o que só passou na segunda. Um teste instável é tratado como bug: descobrir a causa e corrigir, nunca aumentar `retries` para esconder.
