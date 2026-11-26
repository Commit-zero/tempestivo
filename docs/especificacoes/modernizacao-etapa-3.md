# Etapa 3: planilhas Excel (`exportacoes`)

**Situação:** proposta em 26/11/2026, aguardando aprovação. Nenhum código desta etapa foi escrito.

Faz parte do [mapa da modernização](modernizacao.md) (pedido 7). A branch `modernizacao/etapa-3-exportacoes` parte da branch da [Etapa 2](modernizacao-etapa-2.md). Nada vai para a `main` antes do fim da final de 27/11/2026.

## Objetivo

O advogado baixa em `.xlsx` o que vê nas listas, para filtrar, somar e guardar no Excel, no Google Planilhas ou no LibreOffice. A exportação completa em JSON (portabilidade, LGPD) continua como está.

## Planilhas

Um botão **Baixar planilha** em cada lista. Ele leva junto o filtro e a busca que estão na tela. É um link, então funciona sem JavaScript.

| Lista | Filtro levado | Abas e colunas |
|---|---|---|
| Clientes | busca por nome | Nome, CPF ou CNPJ, E-mail, Telefone, Observações, Processos (quantidade), Cadastrado em |
| Processos | busca e situação | Número (CNJ), Cliente, Assunto, Tribunal, Vara, Parte contrária, Situação, Cadastrado em |
| Prazos | filtro escolhido | Descrição, Cliente, Processo, Número, Tribunal, **Data final (cálculo auxiliar, confira)**, Origem da data (calculada ou manual), Meta interna, Situação, Última conferência, Cumprido em |
| Honorários | nenhum | Aba **Honorários**: Cliente, Descrição, Processo, Total, Pago, Em aberto, Em atraso. Aba **Parcelas**: Cliente, Descrição, Parcela, Valor, Vencimento, Situação, Paga em |
| Audiências | nenhum | Abas **Próximas** e **Realizadas**: Data, Hora, Duração em minutos, Tipo, Cliente, Processo, Número, Local, Observações |
| Tarefas | nenhum | Título, Descrição, Coluna do quadro, Data limite, Processo |

Fica **de fora**: o link de sala virtual das audiências (costuma levar a senha), identificadores internos, tokens, dados de acesso e do segundo fator.

A planilha de prazos tem também uma aba **Leia-me** com "cálculo auxiliar, confira" e o aviso de que as regras ainda não foram validadas por um advogado. O aviso vai no cabeçalho da coluna para continuar junto quando alguém copiar só a tabela.

## Formato

- **Datas** são datas de verdade, que ordenam e filtram, exibidas como `dd/mm/aaaa`. Instantes (audiência, pagamento, conferência) saem no horário de São Paulo, com `dd/mm/aaaa hh:mm` quando a hora importa.
- **Dinheiro** é número, no formato de reais, para somar.
- **CPF, CNPJ, número CNJ e telefone** são texto, para não perder zeros nem virar notação científica.
- **Texto digitado** sempre vai como célula de texto, nunca como fórmula, mesmo começando por `=`, `+`, `-` ou `@`. Caracteres que o formato não aceita são removidos.
- Cabeçalho em negrito e fixo, larguras de coluna definidas. Lista vazia gera a planilha só com o cabeçalho.
- Nome do arquivo sem dado pessoal: `tempestivo-prazos-2026-11-26.xlsx` (data em São Paulo).

## Segurança e privacidade

- Rota `GET /exportar/[lista]`, com a lista e os filtros conferidos contra valores fixos. Lista desconhecida responde 404; sem sessão, 401.
- A conta vem **só da sessão**. Nenhum parâmetro escolhe a conta.
- A planilha é montada na memória e enviada na hora. Nada é gravado no servidor nem enviado a terceiros. Resposta com `Cache-Control: private, no-store`.
- Limite de 10 planilhas por conta a cada minuto.
- Os logs registram, no máximo, a lista e o tipo do erro.
- Perto do botão, um aviso curto: o arquivo contém dados pessoais dos clientes; guarde com cuidado. A busca vai no endereço, como já acontece nas listas.

## Dependência

[`write-excel-file`](https://gitlab.com/catamphetamine/write-excel-file) 4.1.1: MIT, gratuita, uma dependência (`fflate`, MIT, sem dependências), sem script de instalação. Conferido no registro npm em 26/11/2026. O `exceljs` 4.4.0 foi modificado pela última vez em dezembro de 2024.

A documentação **não diz** como a biblioteca trata fuso horário em datas, texto iniciado por `=`, caracteres inválidos em XML e limites do nome da aba. A primeira tarefa prova cada ponto abrindo o arquivo gerado nos testes. Se algum não puder ser garantido, parar e avisar antes de seguir.

## Estrutura e padrões

| Onde | O que fica |
|---|---|
| `src/lib/planilha.ts` | Único ponto que usa a biblioteca: células de texto, data, data com hora e dinheiro |
| `src/modules/exportacoes/` (novo) | Monta cada planilha a partir do `index.ts` dos outros módulos, sempre com `contaId` primeiro |
| `src/app/exportar/[lista]/route.ts` | Sessão, validação, limite e resposta |
| Páginas das listas | O botão, com o filtro atual |

```ts
const planilha = await montarPlanilha(sessao.contaId, "prazos", { filtro }, agora);
```

Sem migração, sem mudança em regra de prazo e sem mudança no que as listas mostram.

## Testes

Teste antes do código. Comandos:

```powershell
corepack pnpm lint
```

```powershell
corepack pnpm typecheck
```

```powershell
corepack pnpm test:cobertura
```

```powershell
corepack pnpm build
```

```powershell
corepack pnpm e2e
```

- **Unidade:** o arquivo gerado é aberto no teste (com o `fflate`, que passa a ser dependência de desenvolvimento declarada) para conferir tipo de cada célula, número de série das datas, nos limites de virada de dia em São Paulo, fórmulas ausentes e caracteres inválidos.
- **Integração, com Postgres:** cada planilha traz só os dados da própria conta; os filtros batem com os da tela; o que fica de fora não aparece em nenhuma parte do arquivo.
- **Telas:** o botão baixa o arquivo com o filtro atual; sem sessão, 401; lista desconhecida, 404; botão com 44 px no celular.
- Antes do PR: `revisor-seguranca-lgpd`, `qa-responsivo` e revisão de código.

## Limites

- **Sempre:** `contaId` obrigatório, dados fictícios, "cálculo auxiliar, confira" junto de prazo.
- **Perguntar antes:** outra dependência, gravar arquivo no servidor, mudar a exportação JSON.
- **Nunca:** fórmula criada a partir de texto digitado, link de sala virtual ou segredo na planilha, dado pessoal no nome do arquivo ou no log.

## Fora desta etapa

PDF e CSV; importação de planilha; relatório por período ou com gráficos; envio por e-mail e agendamento; escolha de colunas; planilhas do painel do proprietário (Etapa 7); registro de auditoria dos downloads (Etapa 6).

## Critérios de aceite

1. As seis listas têm o botão, e o arquivo respeita o filtro e a busca da tela.
2. Uma conta nunca recebe dado de outra.
3. Datas ordenam como datas e aparecem em dd/mm/aaaa no horário de São Paulo; valores somam.
4. Nenhuma célula vinda de texto digitado é fórmula.
5. Prazos levam "cálculo auxiliar, confira" no cabeçalho da data e na aba Leia-me.
6. Link de sala virtual, identificadores e segredos não aparecem.
7. Sem sessão, 401; lista desconhecida, 404; o limite funciona; nada é armazenado.
8. Lint, tipos, testes com cobertura, build e testes de tela passam; documentação atualizada. Informar o que não foi verificado, como a abertura em cada programa de planilha.

## Perguntas em aberto

A recomendação vale se a especificação for aprovada sem ressalvas.

1. **O mapa fala em "planilhas por lista e relatório". O que é o relatório?** Recomendo uma **planilha completa**, baixada na tela Conta: todas as listas acima, sem filtro, uma aba para cada, mais uma aba Resumo com as quantidades e os totais de honorários (a receber, em atraso e recebido no mês). Relatórios por período ficam para depois.
2. **CPF ou CNPJ completo na planilha de clientes?** Recomendo sim: são dados que o próprio advogado cadastrou, e a planilha serve para o trabalho dele. O aviso junto do botão lembra que o arquivo é sensível.
3. **Incluir os campos de observações e descrição, que são texto livre?** Recomendo sim, porque sem eles a planilha perde utilidade. Eles podem conter dado sensível, e o aviso vale também para eles.
