# Mapa de módulos

Cada módulo fica em `src/modules/<id>/` e só é usado de fora pelo seu `index.ts`. As setas de dependência apontam em uma direção só, sem ciclos; o lint impõe a regra.

| Módulo | Responsabilidade | Depende de |
|---|---|---|
| `conta` | Dados da conta, advogado substituto, exportar e excluir dados (LGPD) | — |
| `clientes` | Cadastro de clientes | — |
| `processos` | Processos, número único do CNJ, arquivamento | `clientes` |
| `prazos` | Calculadora, prazos, "li e conferi", status honesto, catálogo, dias sem expediente | `processos` |
| `alertas` | E-mails em camadas, escalada ao substituto, link de conferência, job | `prazos` |
| `intimacao` | Leitor de intimação: só gera rascunho | `processos` |
| `honorarios` | Honorários, parcelas, resumo financeiro, cobrança por `wa.me` | `clientes`, `processos` |
| `audiencias` | Audiências, rota, arquivo `.ics` | `processos` |
| `tarefas` | Quadro de três colunas | `processos` |

O login não é um módulo: fica na porta `src/platform/auth/` (Better Auth), que entrega a sessão com o `contaId`.

## Portas (`src/platform/`)

| Porta | Adaptador de hoje | Como trocar |
|---|---|---|
| `config` | variáveis de ambiente validadas com zod | — |
| `database` | cliente Prisma único (PostgreSQL) | outra `DATABASE_URL` |
| `auth` | Better Auth, senhas em Argon2id | — |
| `mailer` | SMTP (`nodemailer`); `fake` em teste | novo adaptador + `MAILER_DRIVER` |
| `ai` | extrator local por regras | novo adaptador + `AI_DRIVER` |
| `scheduler` | chamada HTTP com segredo (GitHub Actions) | qualquer cron que faça `POST` |
| `logger` | JSON de uma linha com redação de dados sensíveis | — |
| `health` | `SELECT 1` no banco | — |
| `runtime` | raiz de composição: monta as portas uma vez | — |

## Especificações

As especificações aprovadas ficam em [`especificacoes/`](especificacoes/). Elas registram as decisões e as fontes consultadas na época; quando o código e a especificação divergem, vale o código, e a divergência conhecida está anotada aqui:

- **Feriados:** a especificação previa a BrasilAPI com tabela local de reserva. Os feriados nacionais são calculados localmente (as datas são fixas ou derivam da Páscoa), sem dependência de rede.
- **Leitor de intimação:** a especificação previa o Gemini. O adaptador de hoje é local, por regras; um modelo de linguagem entra pela mesma porta.
- **Arquivos e notificações push:** as portas `storage` e `notifier` foram removidas por não terem adaptador real nem uso. Voltam com o módulo que precisar delas.
