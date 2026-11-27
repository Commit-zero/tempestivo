# Módulos e portas

Cada módulo fica em `src/modules/<id>/` e só é usado de fora pelo seu `index.ts`. As setas de dependência apontam em uma direção só, sem ciclos; o lint impõe a regra.

| Módulo | Responsabilidade | Depende de |
|---|---|---|
| `conta` | Dados da conta, advogado substituto, margem da meta interna, link da agenda, exportar e excluir dados (LGPD) | — |
| `clientes` | Cadastro de clientes | — |
| `processos` | Processos, número único do CNJ, arquivamento | `clientes` |
| `prazos` | Calculadora, prazos, "li e conferi", status honesto, meta interna, catálogo, dias sem expediente | `processos`, `conta` |
| `alertas` | E-mails em camadas, escalada ao substituto, link de conferência, job | `prazos` |
| `intimacao` | Leitor de intimação: só gera rascunho | `processos` |
| `honorarios` | Honorários, parcelas, resumo financeiro, cobrança por `wa.me` | `clientes`, `processos` |
| `audiencias` | Audiências, rota, arquivo `.ics` | `processos` |
| `tarefas` | Quadro de três colunas | `processos` |
| `agenda` | Calendário assinável (iCalendar) com vencimentos, metas internas e audiências | `conta`, `prazos`, `audiencias`, `processos` |
| `exportacoes` | Planilhas `.xlsx` de cada lista e a planilha completa; não grava nada | `clientes`, `processos`, `prazos`, `honorarios`, `audiencias`, `tarefas` |

A exportação de dados da conta lê os outros módulos só nos testes; em produção, `conta` não depende de ninguém.

Utilitários puros que mais de um módulo usa ficam em `src/lib/`: datas civis, dinheiro, documentos (CPF, CNPJ, CNJ), iCalendar, ids, limitador, validação, formulários e termos.

O login não é um módulo: fica na porta `src/platform/auth/` (Better Auth), que entrega a sessão com o `contaId`.

## Portas (`src/platform/`)

| Porta | Adaptador de hoje | Como trocar |
|---|---|---|
| `config` | variáveis de ambiente validadas com zod | — |
| `database` | cliente Prisma único (PostgreSQL) | outra `DATABASE_URL` |
| `auth` | Better Auth, senhas em Argon2id, segundo fator por aplicativo autenticador | — |
| `mailer` | SMTP (`nodemailer`); `fake` em teste | novo adaptador + `MAILER_DRIVER` |
| `ai` | extrator local por regras | novo adaptador + `AI_DRIVER` |
| `scheduler` | chamada HTTP com segredo (GitHub Actions) | qualquer cron que faça `POST` |
| `logger` | JSON de uma linha com redação de dados sensíveis | — |
| `health` | `SELECT 1` no banco | — |
| `runtime` | raiz de composição: monta as portas uma vez | — |
