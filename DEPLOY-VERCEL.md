# Deploy no Vercel (plano Hobby, custo zero)

Estado: a base-A é só a página inicial e as portas com fakes. Não há banco, login nem jobs ainda, então o deploy serve para provar o caminho (build, variáveis, domínio). O deploy de verdade com dados entra na base-B.

## 0. Bloqueio a resolver antes de tudo: repositório de organização

O repositório `Commit-zero/tempestivo` é **privado e pertence a uma organização**. Segundo a documentação e relatos da comunidade do Vercel, o plano **Hobby não faz deploy de repositório privado de organização** (a verificação é feita pelo Vercel e pode mudar; confira na hora de importar). Escolha um caminho, todos de custo zero:

| Opção | Como | Contra |
|---|---|---|
| A. Tornar o repositório público | GitHub, Settings, Danger Zone | Código e documentação ficam públicos; a spec e o plano mostram a estratégia. Nunca commitar segredos (o `.env` já é ignorado) |
| B. Repositório pessoal privado só para deploy | Criar `vitor/tempestivo` (conta pessoal) e espelhar a `main` da organização | Dois repositórios para manter; só o dono do Hobby dispara deploy |
| C. Pular o Vercel por enquanto | Rodar a imagem Docker em outro serviço gratuito na base-B | Deixa de usar o que o `CLAUDE.md` definiu |

Decisão pendente do Vitor. O resto deste guia vale para A e B.

Obs.: o Hobby é para uso não comercial. Para o desafio da UMC serve; uma cobrança de honorários de clientes reais exigirá rever o plano.

## 1. O que já está pronto no projeto

- Next.js 16 é detectado sozinho; **não precisa de `vercel.json`**.
- Node: `engines.node` é `>=24.22.1 <25`; o Vercel oferece 24.x e usa a última 24.x. Se reclamar, em Project Settings, Build and Deployment, Node.js Version, escolha **24.x**.
- pnpm: o Vercel suporta pnpm 12 e escolhe a versão pelo `pnpm-lock.yaml` (e pelo `packageManager`, se o Corepack estiver ativo). Deixe o Install Command padrão. Se o log de instalação mostrar outra versão e falhar, defina `ENABLE_EXPERIMENTAL_COREPACK=1` nas variáveis do projeto.
- `pnpm build` passa **sem** `.env` (verificado na A7): o build não precisa de segredo.
- Em execução, a configuração é validada na subida (`instrumentation.ts`). **Variável faltando derruba o servidor com código 1**, então o deploy só funciona com as variáveis abaixo.

## 2. Variáveis de ambiente (Project Settings, Environment Variables)

Marque **Production e Preview** (e Development se usar `vercel dev`). Sem isso, o Preview não sobe.

| Variável | Valor | Observação |
|---|---|---|
| `JOBS_SECRET` | 64 caracteres aleatórios | Gere com o comando abaixo. Marque como **Sensitive** |
| `APP_URL` | URL pública do deploy | Production: `https://<seu-projeto>.vercel.app` (ou o domínio próprio). Preview: pode ser a mesma URL de produção, só precisa ser uma URL válida |
| `LOG_LEVEL` | `info` | Opcional (padrão `info`) |
| `NEXT_TELEMETRY_DISABLED` | `1` | Opcional |

`NODE_ENV` o Vercel define sozinho como `production`. As variáveis `*_DRIVER` ficam sem valor (padrão `fake`).

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Nunca use o segredo de produção em Preview nem no CI. Depois do primeiro deploy, copie a URL real para `APP_URL` e faça um novo deploy.

## 3. Passo a passo

1. Resolver o item 0 (repositório).
2. Entrar em vercel.com com a conta pessoal (plano Hobby, sem cartão) e instalar o app do Vercel no GitHub, autorizando só o repositório do Tempestivo.
3. Add New, Project, importar o repositório. Framework: Next.js (automático). Root Directory: raiz. Não mexer em Build Command nem Install Command.
4. Cadastrar as variáveis da seção 2 **antes** de clicar em Deploy.
5. Deploy. Conferir no log: Node 24, pnpm 12, "Compiled successfully".
6. Abrir a URL e ver a página "Tempestivo". Em 360 px não deve haver rolagem horizontal.
7. Em Settings, Git, Production Branch: `main`. Pull requests geram Preview automaticamente.

## 4. Se algo falhar

| Sintoma | Causa provável |
|---|---|
| Erro de permissão ao importar | Item 0 (repositório de organização no Hobby) |
| Deploy "verde" mas toda requisição dá erro 500 | Variável faltando ou inválida; o log de Functions mostra `Configuração inválida. Corrija as variáveis: ...` (só nomes, nunca valores) |
| `Unsupported engine` ou versão de Node errada | Escolher Node.js 24.x nas configurações do projeto |
| Falha no `pnpm install` | Ver a versão do pnpm no log; usar `ENABLE_EXPERIMENTAL_COREPACK=1` |

## 5. Fora deste deploy (base-B em diante)

Banco (Supabase), login (Better Auth), `/api/jobs/*` e o agendador do GitHub Actions (que precisa do mesmo `JOBS_SECRET` em Secrets do GitHub), e-mail SMTP e Storage S3. Cada um traz variáveis novas no `src/platform/config`, que devem ser acrescentadas à tabela da seção 2.
