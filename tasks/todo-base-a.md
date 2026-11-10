# Tarefas: módulo `base`, entrega base-A

Detalhes, critérios de aceite e verificação de cada tarefa em `tasks/plan-base-a.md`. Spec: `SPEC-base.md`. Os arquivos `tasks/plan.md` e `tasks/todo.md` são do módulo `prazos`.

## Pré-requisitos (fora das tarefas)
- [ ] P1. Reabrir o Claude Code; `node -v` = v24.22.1 e `pnpm -v` = 12.16.1 (Vitor)
- [x] P2. Commit inicial só com a documentação existente, a pedido do Vitor (28/10/2026)
- [x] P3. Repositório `Commit-zero/tempestivo` confirmado como privado (Vitor; `origin` já existe; necessário para A5 e A15)
- [ ] P4. Vini convidado na organização e com Node 24.22.1 e pnpm 12.16.1 instalados

## Fase 1: Projeto e ferramentas
- [x] A1. Criar o projeto Next.js e fixar as versões (M, exceção de arquivos)
- [x] A2. Higiene do repositório: `.gitignore` e `.gitattributes` (XS)
- [x] A3. Estrutura de pastas, shadcn/ui e página inicial em português (S)
- [x] A4. Vitest configurado (S)

### Checkpoint 1: ferramentas
- [ ] `pnpm install --frozen-lockfile`, lint, `tsc`, testes e build passam
- [ ] Versões fixadas conferidas e registradas
- [ ] Revisão cruzada do Vini no PR de A1
- [ ] Vini e Vitor já trabalham em paralelo

## Fase 2: Integração contínua
- [x] A5. CI de qualidade: lint, `tsc`, testes, build (M)

## Fase 3: Núcleo das portas (teste primeiro)
- [x] A6. Porta `config` com zod e `.env.example` (M)
- [x] A7. Validar a configuração ao subir o servidor (S) — opção 2: `process.exit(1)` no `register`, só no runtime nodejs
- [x] A8. Porta `logger` (S)
- [x] A9. Porta `scheduler` (S)

### Checkpoint 2: núcleo
- [ ] Testes, `tsc`, lint, build e CI verdes
- [ ] `revisor-seguranca-lgpd` sem achados críticos ou altos
- [ ] Nenhum segredo em mensagem de erro nem em log
- [ ] Revisão cruzada do Vini

## Fase 4: Demais portas
- [x] A10. Porta `storage` (S)
- [x] A11. Porta `mailer` (S)
- [x] A12. Porta `notifier` (S)
- [x] A13. Porta `ai` / `Extrator` (S)

### Checkpoint 3: portas completas
- [ ] As sete portas têm interface, fake, fábrica e teste
- [ ] `pnpm test` e CI verdes
- [ ] Revisão cruzada do Vini

## Fase 5: Fronteiras e e2e
- [x] A14. Fronteiras impostas por lint, com teste (M)
- [x] A15. Playwright, e2e nas três larguras e job no CI (M) — job `e2e` ainda não rodou no GitHub; local só com `PLAYWRIGHT_CHANNEL=msedge`

### Checkpoint 4: CI completo
- [ ] `pnpm e2e` passa em 360, 768 e 1280 px; job `e2e` verde
- [ ] CI total dentro de 8 minutos
- [ ] `qa-responsivo` sem falhas na página inicial

## Fase 6: Documentação e fechamento
- [x] A16. README e percurso de máquina limpa (S) — clone limpo: install 1m10s, página em 89s no total; falta o teste do Vini

### Checkpoint final: base-A
- [ ] Critérios de sucesso da base-A na spec marcados, com evidência
- [ ] `revisor-seguranca-lgpd` sem achados críticos ou altos
- [ ] Definição de pronto cumprida
- [ ] Revisão cruzada do Vini em todos os PRs
- [ ] `CAPABILITY-MAP.md` atualizado com a base-A concluída
- [ ] Vitor aprova o fechamento antes do plano da base-B
