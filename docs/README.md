# Documentação técnica

## Por onde começar

| Quero | Leia |
| --- | --- |
| Saber o que o sistema faz | [Requisitos](requisitos.md) |
| Rodar na minha máquina | [Desenvolvimento local](guias/desenvolvimento-local.md) |
| Entender o código | [Visão geral da arquitetura](arquitetura/visao-geral.md) |
| Contribuir | [Guia de contribuição](../CONTRIBUTING.md) |
| Publicar | [Guia de publicação](guias/publicacao.md) |
| Resolver um problema no ar | [Operação](operacao/README.md) |

## Arquitetura

| Documento | O que responde |
| --- | --- |
| [Visão geral](arquitetura/visao-geral.md) | Contexto, camadas, fluxo de uma requisição e atributos de qualidade |
| [Módulos e portas](arquitetura/modulos.md) | Responsabilidade e dependências de cada módulo |
| [Modelo de dados](arquitetura/modelo-de-dados.md) | Entidades, convenções, migrações e exclusão |
| [Decisões (ADRs)](adr/README.md) | Por que cada escolha foi feita e o que ela custa |

## Referência

| Documento | O que responde |
| --- | --- |
| [Rotas e interfaces](referencia/rotas-e-interfaces.md) | Páginas, rotas HTTP, Server Actions e contratos |
| [Configuração](referencia/configuracao.md) | Variáveis de ambiente, limites e validades |
| [Regras de prazo](../src/modules/prazos/regras.md) | Regras da calculadora, referência legal e situação da validação |

## Guias

| Documento | Para quê |
| --- | --- |
| [Desenvolvimento local](guias/desenvolvimento-local.md) | Preparar o ambiente |
| [Testes](guias/testes.md) | Estratégia, cobertura e como escrever um teste |
| [Publicação](guias/publicacao.md) | Vercel e Supabase, imagem Docker e ordem de entrega |

## Operação e segurança

| Documento | Para quê |
| --- | --- |
| [Operação](operacao/README.md) | Saúde, logs, jobs, backup e índice dos runbooks |
| [Dados pessoais e LGPD](seguranca/privacidade-e-dados.md) | Inventário, compartilhamento e direitos do titular |
| [Política de segurança](../SECURITY.md) | Como relatar uma falha, práticas e limites conhecidos |

## Mantendo a documentação

- Mudou o comportamento? Atualize o documento no mesmo pull request.
- Decisão de arquitetura nova vira um [ADR](adr/README.md).
- Diagramas em Mermaid, dentro do próprio Markdown.
- Não documente o que não puder ser conferido no código ou executado.
