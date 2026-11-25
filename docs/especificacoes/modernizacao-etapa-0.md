# Etapa 0: `protecao-da-main`

Plano de tarefas da Etapa 0 da [modernização](modernizacao.md). Nada daqui muda o comportamento do app. A branch `modernizacao/etapa-0-protecao` só vai à `main` depois do fim da final de 27/11/2026.

## Tarefas

### T1. Corrigir a CVE-2026-109518 (`apt`) na imagem
- Aceite: o Trivy, com os mesmos parâmetros do `seguranca.yml`, não acha CVE alta ou crítica com correção na imagem `runner`; a imagem constrói, migra e responde em `/api/health` sem root.
- Verificação: `docker build` dos alvos `runner` e `migrator`, `trivy image` e o roteiro do job `imagem`.
- Arquivos: `Dockerfile`.

### T2. Verificar pull requests de fork
- Aceite: `ci.yml` e `seguranca.yml` rodam em `pull_request` e em `push` na `main`; nenhum usa `pull_request_target` nem recebe segredo; a varredura da imagem continua fora dos PRs.
- Verificação: teste que lê os workflows; execução real só quando houver PR.
- Arquivos: `.github/workflows/ci.yml`, `.github/workflows/seguranca.yml`, `src/lint/workflows.test.ts`.

### T3. Corrigir os documentos
- Aceite: `deploy.md` manda desligar a Data API; `SECURITY.md` e `operacao.md` descrevem a resposta real de `/api/health`; a frequência do agendador é descrita como pedida (2 horas) e observada (atrasos de várias horas); os textos sobre gatilhos do CI batem com os workflows.
- Verificação: busca pelos textos antigos e conferência com o código.
- Arquivos: `README.md`, `SECURITY.md`, `docs/`.

### Ponto de controle
`lint`, `typecheck`, testes com cobertura, `build`, `e2e` e revisão de segurança dos workflows.

## Depois da final, com confirmação

1. Conferir na Vercel que o ambiente *Preview* não tem variáveis de produção. Só então enviar a branch.
2. Abrir o PR e ver os checks passarem.
3. Mesclar (publica em produção) e conferir `/api/health`.
4. Criar o ruleset da `main`: PR obrigatório e os checks `qualidade`, `e2e`, `imagem`, `segredos (TruffleHog)`, `dependências (Trivy)` e `código (Semgrep)`. A varredura `imagem (Trivy e SBOM)` fica fora, porque não roda em PR.
5. Provar que um PR com teste quebrado não pode ser mesclado.

## Riscos

| Risco | Mitigação |
|---|---|
| PR de fork roda código de terceiro no CI | `pull_request` não entrega segredos e o token é só de leitura (`contents: read`). Não usar `pull_request_target` |
| Check obrigatório que não roda trava o merge | Exigir só checks que rodam em todo PR, sem filtro de caminho |
| PR de branch do próprio repositório rodar duas vezes | `push` restrito à `main` |
