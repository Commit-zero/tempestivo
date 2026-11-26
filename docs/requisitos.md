# Requisitos do sistema

O que o Tempestivo faz hoje e qual teste comprova cada comportamento. Serve para quem vai avaliar o produto, planejar uma mudança ou conferir se algo deixou de funcionar.

**Público:** advogado autônomo, uma pessoa por conta. **Objetivo:** não perder prazo e receber honorário.

Os caminhos de teste partem de `src/`, exceto os que começam por `e2e/`.

## Requisitos funcionais

### Conta e acesso

| ID | Requisito | Comprovação |
| --- | --- | --- |
| RF-01 | Cadastro com aceite dos Termos de uso e da Política de privacidade, registrado com data e versão | `e2e/conta.spec.ts`, `modules/conta/conta.test.ts` |
| RF-02 | Senha nova com 10 a 128 caracteres, digitada duas vezes e conferida no servidor, fora de uma lista de senhas comuns | `lib/regras-de-senha.test.ts`, `platform/auth/senhas.test.ts` |
| RF-03 | Confirmação do e-mail por link, que confirma o endereço sem abrir sessão | `platform/auth/confirmar-email.test.ts`, `e2e/conta.spec.ts` |
| RF-04 | Recuperação de senha sem revelar se o e-mail tem cadastro; troca de senha com a sessão aberta, exigindo a atual | `platform/auth/senha.test.ts`, `e2e/conta.spec.ts` |
| RF-05 | Segundo fator opcional por aplicativo autenticador, com códigos de recuperação | `platform/auth/segundo-fator.test.ts`, `platform/auth/ativacao.test.ts`, `e2e/seguranca.spec.ts` |
| RF-06 | Exportação de todos os dados da conta em JSON e exclusão definitiva, confirmada com a senha | `modules/conta/conta.test.ts`, `e2e/conta.spec.ts` |

### Clientes e processos

| ID | Requisito | Comprovação |
| --- | --- | --- |
| RF-10 | Cadastro e busca de clientes, com validação dos dígitos de CPF e CNPJ | `modules/clientes/clientes.test.ts`, `lib/documento.test.ts` |
| RF-11 | Processos com validação do número único do CNJ, busca e arquivamento | `modules/processos/processos.test.ts`, `e2e/cadastros.spec.ts` |

### Prazos

| ID | Requisito | Comprovação |
| --- | --- | --- |
| RF-20 | Calculadora para CPC e CLT (TJSP e TRT-2) em dias úteis, com o passo a passo, as regras aplicadas e os avisos. Regras em [`regras.md`](../src/modules/prazos/regras.md) | `modules/prazos/__tests__/calcular-prazo.test.ts` |
| RF-21 | Fora do escopo, a calculadora recusa e pede a data final digitada | `modules/prazos/__tests__/calcular-prazo.test.ts`, `e2e/prazos.spec.ts` |
| RF-22 | Enquanto as regras não forem validadas, a data calculada só é salva com a declaração de conferência nos autos | `modules/prazos/__tests__/servico.test.ts`, `e2e/prazos.spec.ts` |
| RF-23 | Registro de cada conferência, histórico das mudanças e destaque após 3 dias sem conferência | `modules/prazos/__tests__/situacao.test.ts`, `modules/prazos/__tests__/servico.test.ts` |
| RF-24 | Meta interna em dias úteis antes do vencimento (2 por padrão, de 0 a 10) | `modules/prazos/__tests__/meta-interna.test.ts`, `e2e/agenda.spec.ts` |
| RF-25 | Catálogo de tipos de prazo ajustável por conta e cadastro de dias sem expediente | `e2e/prazos.spec.ts` |
| RF-26 | Leitor de intimação: o texto colado vira um rascunho com o trecho de origem de cada campo. O prazo só existe depois de salvo pelo advogado | `modules/intimacao/intimacao.test.ts`, `platform/ai/extrator-local.test.ts`, `e2e/prazos.spec.ts` |

### Alertas

| ID | Requisito | Comprovação |
| --- | --- | --- |
| RF-30 | E-mail ao titular quando faltam 5, 2 e 1 dia útil e no dia do vencimento, só para e-mail confirmado. Os dias são de segunda a sexta, sem considerar feriados | `modules/alertas/camadas.test.ts`, `modules/alertas/alertas.test.ts` |
| RF-31 | Escalada ao substituto na véspera ou no dia, se não houve conferência. Ele precisa aceitar o convite e recebe só a data | `modules/alertas/alertas.test.ts`, `e2e/alertas.spec.ts` |
| RF-32 | Link "li e conferi" no e-mail, de uso único, que só confirma com um clique na página | `modules/alertas/alertas.test.ts`, `e2e/alertas.spec.ts` |

### Rotina do escritório

| ID | Requisito | Comprovação |
| --- | --- | --- |
| RF-40 | Honorários em parcelas, situação de cada uma, resumo financeiro e cobrança pronta por link do WhatsApp | `modules/honorarios/honorarios.test.ts`, `modules/honorarios/parcelas.test.ts`, `e2e/rotina.spec.ts` |
| RF-41 | Audiências com rota, sala virtual e arquivo `.ics` | `modules/audiencias/audiencias.test.ts`, `e2e/rotina.spec.ts` |
| RF-42 | Quadro de tarefas com três colunas | `modules/tarefas/tarefas.test.ts`, `e2e/rotina.spec.ts` |
| RF-43 | Agenda assinável (iCalendar), com link secreto revogável e sem nome de cliente ou de parte | `modules/agenda/agenda.test.ts`, `e2e/agenda.spec.ts` |
| RF-44 | Planilhas `.xlsx` de cada lista, com o filtro da tela, e uma planilha completa com resumo | `modules/exportacoes/exportacoes.test.ts`, `lib/planilha.test.ts`, `e2e/planilhas.spec.ts` |
| RF-45 | Aviso do resultado de cada ação e confirmação antes de excluir, conferida no servidor | `e2e/avisos.spec.ts`, `e2e/confirmacao.spec.ts` |

## Requisitos não funcionais

| ID | Requisito | Critério | Comprovação |
| --- | --- | --- | --- |
| RNF-01 | Isolamento entre contas | Uma conta não lê, altera nem apaga dados de outra | testes de integração de cada módulo |
| RNF-02 | Responsividade | Telas em 360, 768 e 1280 px sem rolagem horizontal; reflow em 320 px | `e2e/` |
| RNF-03 | Acessibilidade | Contraste WCAG por par de cores, estrutura e nomes acessíveis nas telas, alvos de 44 px no celular | `test/contraste.test.ts`, `e2e/acessibilidade.spec.ts`, `e2e/alvos-de-toque.spec.ts` |
| RNF-04 | Datas | `dd/mm/aaaa` nas telas, fuso `America/Sao_Paulo` | `lib/datas.test.ts` |
| RNF-05 | Portabilidade | Nenhum recurso exclusivo de provedor; imagem Docker sobe e responde `/api/health` | `lint/fronteiras.test.ts`, job `imagem` do CI |
| RNF-06 | Cobertura de testes | No mínimo 90% das instruções, 85% dos ramos, 90% das funções e das linhas em `src/modules`, `src/lib` e `src/platform` | `pnpm test:cobertura` |
| RNF-07 | Custo | Nenhum serviço pago é necessário para rodar | [guia de publicação](guias/publicacao.md) |
| RNF-08 | Privacidade | Dados pessoais fora dos logs e dos nomes de arquivo | `platform/logger/json-logger.test.ts`, [dados pessoais](seguranca/privacidade-e-dados.md) |

A verificação automática de acessibilidade não substitui o teste com teclado e leitor de tela. Não há requisito de desempenho medido.

## Fora do escopo atual

Pix automático, integração com tribunais, WhatsApp pela API oficial, várias pessoas por conta, aplicativo nativo, anexos de arquivos, notificações push e leitor de intimação com modelo de linguagem. Os motivos de parte dessas escolhas estão no [ADR 0016](adr/0016-limites-do-produto-nesta-fase.md).

## Limitações conhecidas

- **Regras de prazo sem validação de advogado.** Toda data calculada é auxiliar.
- Só TJSP e TRT-2. Feriados municipais entram como dia sem expediente cadastrado.
- Os limites de tentativas ficam em memória e valem por instância do servidor.
- Termos de uso e Política de privacidade ainda não passaram por revisão jurídica.
- O agendador gratuito não garante o horário das execuções.
