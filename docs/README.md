# Documentação técnica

| Documento | Para quem | O que responde |
|---|---|---|
| [arquitetura.md](arquitetura.md) | quem vai mexer no código | Como o sistema é organizado, as camadas, o fluxo de uma requisição e o registro de decisões (D1 a D13) |
| [mapa-de-modulos.md](mapa-de-modulos.md) | quem vai mexer num módulo | Responsabilidade e dependências de cada módulo e de cada porta |
| [modelo-de-dados.md](modelo-de-dados.md) | quem vai mudar o banco | Entidades, convenções, migrações e retenção |
| [rotas-e-api.md](rotas-e-api.md) | quem vai criar tela, rota ou integração | Páginas, rotas HTTP, contrato do agendador e da agenda, padrão das Server Actions |
| [testes.md](testes.md) | todos | Pirâmide de testes, cobertura, dados fictícios e como escrever um teste |
| [deploy.md](deploy.md) | quem publica | Vercel + Supabase, imagem Docker, variáveis, ordem de entrega e reversão |
| [operacao.md](operacao.md) | quem mantém no ar | Saúde, logs, jobs, incidentes, troca de segredos, LGPD e backup |
| [../SECURITY.md](../SECURITY.md) | todos | Como reportar vulnerabilidade e as práticas de segurança |

## Especificações

As especificações registram o objetivo, as decisões e os critérios de aceite de cada entrega. Quando o código diverge, vale o código, e a divergência é anotada no [mapa de módulos](mapa-de-modulos.md#especificações).

| Especificação | Escopo |
|---|---|
| [especificacoes/base.md](especificacoes/base.md) | Fundação: portas, banco, login, CI, Docker |
| [especificacoes/prazos.md](especificacoes/prazos.md) | Calculadora de prazos, catálogo, conferência |
| [especificacoes/agenda.md](especificacoes/agenda.md) | Meta interna e agenda assinável |
| [especificacoes/modernizacao.md](especificacoes/modernizacao.md) | Mapa da modernização: decisões, etapas e cronograma |
| [especificacoes/modernizacao-etapa-0.md](especificacoes/modernizacao-etapa-0.md) | Etapa 0: proteção da `main` |
| [especificacoes/modernizacao-etapa-1.md](especificacoes/modernizacao-etapa-1.md) | Etapa 1: senhas e verificação em duas etapas |
| [especificacoes/modernizacao-etapa-1-plano.md](especificacoes/modernizacao-etapa-1-plano.md) | Plano de tarefas da Etapa 1 |
| [especificacoes/modernizacao-etapa-2.md](especificacoes/modernizacao-etapa-2.md) | Etapa 2: identidade visual, página inicial e avisos |
| [especificacoes/modernizacao-etapa-2-plano.md](especificacoes/modernizacao-etapa-2-plano.md) | Plano de tarefas da Etapa 2 |

As regras de contagem de prazo, com a referência legal de cada uma e o estado da validação, ficam junto do código, em [`src/modules/prazos/regras.md`](../src/modules/prazos/regras.md).

## Mantendo a documentação

- Mudou o comportamento? Atualize o documento no mesmo PR: a [definição de pronto](../.claude/references/definition-of-done.md) inclui a documentação.
- Decisão de arquitetura nova entra como D12, D13... em [arquitetura.md](arquitetura.md#registro-de-decisões), com contexto, decisão e consequências. Decisão substituída fica, marcada como tal.
- Funcionalidade nova começa por uma especificação em `especificacoes/` (skill `spec-driven-development`).
- Diagramas em Mermaid, dentro do próprio Markdown, para o GitHub desenhar e o diff mostrar a mudança.
