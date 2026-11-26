# Etapa 3: plano de tarefas

Plano da [especificação da Etapa 3](modernizacao-etapa-3.md), aprovada em 26/11/2026. **Situação:** plano aprovado em 26/11/2026; T1 a T8 prontas na branch (ver "Andamento"). Tudo fica na branch `modernizacao/etapa-3-exportacoes`, sem push antes do fim da final.

## Decisões do plano

| Assunto | Decisão | Motivo |
|---|---|---|
| Quem usa a biblioteca | Só `src/lib/planilha.ts`, com quatro tipos de célula: texto, data, data com hora e dinheiro, além de número inteiro | Um lugar para garantir fuso, texto sem fórmula e caracteres válidos; trocar de biblioteca mexe num arquivo |
| De onde vêm os dados | As mesmas funções de serviço que as telas usam, pelo `index.ts` de cada módulo | O filtro da planilha não tem como divergir do da tela, e `contaId` continua obrigatório |
| Endereço | `GET /exportar/[lista]`, com `clientes`, `processos`, `prazos`, `honorarios`, `audiencias`, `tarefas` e `completa` | Uma rota só concentra sessão, limite e cabeçalhos |
| Limite | 10 planilhas por conta a cada minuto, no módulo `exportacoes` | Testável sem servidor. Em memória, por instância (decisão D11) |
| Aviso de limite | Resposta 429 com texto em português | O botão é um link: a resposta aparece na própria aba |
| Datas | Datas civis e horários de São Paulo viram o número de série correspondente, conferido no arquivo | Evita o dia anterior por causa do fuso |

## Ordem e dependências

```text
T1 base e provas ─ T2 clientes (rota, limite, botão) ─┬─ T3 processos ─┐
                                                      ├─ T4 prazos ────┤
                                                      ├─ T5 honorários ┼─ T7 planilha completa ─ T8 final
                                                      └─ T6 audiências e tarefas ─┘
```

Cada tarefa é um commit, com o teste escrito antes, e deixa o app funcionando.

## Tarefas

### T1. Base da planilha e provas da biblioteca
- Aceite: instalar `write-excel-file` 4.1.1 (versão exata) e declarar `fflate` como dependência de desenvolvimento; gerar um arquivo e conferir, abrindo o XML: texto começando por `=`, `+`, `-` e `@` não vira fórmula; caracteres inválidos saem sem corromper o arquivo; datas e horários com o número de série certo perto da meia-noite de São Paulo, com o computador em outro fuso; dinheiro como número; cabeçalho fixo e larguras.
- Verificação: testes de unidade. Antes de instalar, conferir de novo versão e licença.
- **Ponto de parada:** se alguma prova não puder ser garantida, avisar antes de continuar.
- Arquivos: `src/lib/planilha.ts` e teste, `package.json`, `pnpm-lock.yaml`.
- Depende de: nada. Tamanho: M.

### T2. Clientes, da consulta ao botão
- Aceite: módulo `exportacoes`; rota com 401 sem sessão, 404 para lista desconhecida, 429 no limite, `private, no-store` e nome de arquivo sem dado pessoal; botão na lista levando a busca, com o aviso de arquivo sensível e 44 px no celular.
- Verificação: integração com duas contas (nenhum dado da outra, busca igual à da tela, lista vazia); teste de tela que baixa o arquivo.
- Arquivos: `src/modules/exportacoes/`, `src/app/exportar/[lista]/route.ts`, `src/components/app/baixar-planilha.tsx`, a página de clientes, `e2e/planilhas.spec.ts`.
- Depende de: T1. Tamanho: M.

### T3. Processos
- Aceite: leva busca e situação; número CNJ formatado, como texto.
- Verificação: integração (filtros e isolamento) e teste de tela do endereço do botão.
- Arquivos: módulo `exportacoes`, a página de processos, testes.
- Depende de: T2. Tamanho: P.

### T4. Prazos
- Aceite: leva o filtro; cabeçalho da data com "cálculo auxiliar, confira"; aba Leia-me com o aviso das regras não validadas; origem da data, meta interna e situação iguais às da tela.
- Verificação: integração com prazo calculado, manual, vencido e cumprido. Nenhuma regra de prazo muda; se for preciso mexer em `src/modules/prazos`, rodar o `revisor-de-prazos`.
- Arquivos: módulo `exportacoes`, a página de prazos, testes.
- Depende de: T2. Tamanho: P.

### T5. Honorários e parcelas
- Aceite: duas abas; os totais por honorário somam as parcelas; situação e datas iguais às da tela.
- Verificação: integração com parcela paga, em atraso, vencendo hoje e futura.
- Arquivos: módulo `exportacoes`, a página de honorários, testes.
- Depende de: T2. Tamanho: P.

### T6. Audiências e tarefas
- Aceite: audiências em Próximas e Realizadas, no horário de São Paulo, **sem o link de sala virtual**; tarefas com o nome da coluna do quadro.
- Verificação: integração, procurando o link em todas as partes do arquivo.
- Arquivos: módulo `exportacoes`, as duas páginas, testes.
- Depende de: T2. Tamanho: M.

### T7. Planilha completa na tela Conta
- Aceite: uma aba por lista, sem filtro, mais a aba Resumo com as quantidades e os totais (a receber, em atraso e recebido no mês) iguais aos da tela de honorários; mantém os avisos de prazo; a exportação JSON continua igual.
- Verificação: integração comparando com as planilhas por lista e com `resumoFinanceiro`; teste de que identificadores, tokens, link de sala e dados de acesso não aparecem em nenhuma aba.
- Arquivos: módulo `exportacoes`, a página Conta, testes.
- Depende de: T3 a T6. Tamanho: P.

### T8. Documentos e verificação final
- Aceite: rotas, mapa de módulos, arquitetura (D14), segurança, testes e README atualizados; os 8 critérios conferidos um a um.
- Verificação: todos os comandos, `revisor-seguranca-lgpd`, `qa-responsivo` e revisão de código; resumo do que ficou de fora e por quê.
- Arquivos: `docs/`, `README.md`, `SECURITY.md`.
- Depende de: T7. Tamanho: P.

## Andamento

**T1 a T8, prontas em 26/11/2026.** Passaram: lint, tipos, 576 testes com cobertura (95,6% das instruções, 89,9% dos ramos, 97,5% das funções e 97,3% das linhas) e o build, feito pelo próprio comando dos testes de tela. Nos testes de tela (Edge, 360, 768 e 1280 px), na última rodada completa, 195 passaram, 6 foram pulados e 1 falhou.

- **A falha:** no celular, "exporta os dados da conta e exclui a conta", com a conexão caindo (`ECONNRESET`) no pedido feito depois da exclusão, sem erro no log do servidor. Repetido 4 vezes em cada largura, passou em todas. A causa não foi confirmada; a etapa não muda a rota JSON.
- **Banco de testes acumulado:** com 401 contas de rodadas anteriores, o teste do teto diário de e-mails passou do limite de 20 s. Num banco vazio, como no CI, passou. As verificações finais usaram um banco vazio.
- **Arquivo grande:** só a geração, com 11 colunas e dados fictícios, sem o banco: 1.000 linhas em 100 ms (65 KB), 5.000 em 274 ms (310 KB, cerca de 11 MB a mais de memória) e 20.000 em 1,1 s (1,25 MB, cerca de 70 MB). Cabe com folga no volume de um escritório individual.
- **Biblioteca:** um texto igual ao nome de uma propriedade do JavaScript (`constructor`, `__proto__`) corrompia o arquivo. `src/lib/planilha.ts` contorna acrescentando um caractere invisível, e um teste prova o caso.
- **Revisão de segurança e de código:** nada crítico ou alto. Corrigidos: o atributo `download`, que escondia as mensagens de limite e de erro; testes fracos; documentos que prometiam mais do que o código faz sobre o link da sala; texto no padrão `_xHHHH_`; datas anteriores a março de 1900; pedido vindo de outro site e `HEAD`; parâmetro repetido; e a falta deste registro.
- **QA responsivo:** nada que impedisse o uso. Corrigidos: as mensagens de limite e de sessão vencida viraram uma página legível, com o caminho de volta; o botão só aparece quando há registros; em Tarefas, vem depois do quadro; tamanho do botão e do aviso. Na Conta, o aviso sobre dados pessoais aparece duas vezes, e ficou assim.
- **Sem nova rodada de revisão e de QA** depois dessas correções: elas foram conferidas só pelos testes.

**Não verificado:** abrir o arquivo no Excel, no Google Planilhas e no LibreOffice (os testes conferem o conteúdo do XML); aparelho físico, Safari, Firefox, leitor de tela e app instalado; build da imagem Docker, Trivy e os workflows no GitHub (branch sem push).

**Limites que continuam:** textos livres vão como foram digitados, mesmo com um link colado ali; o limite de 10 por minuto vale por instância.

## Publicação, depois da final e com confirmação

Depois das Etapas 0 a 2 na `main`. Não há migração nem variável nova: um PR com o código. Depois do merge, baixar uma planilha de uma conta fictícia e conferir `/api/health`.

## Riscos

| Risco | Mitigação |
|---|---|
| A biblioteca tratar fuso ou texto de forma inesperada | T1 vem primeiro, com ponto de parada |
| Arquivo grande estourar a memória ou o tempo da hospedagem | Volume de um escritório individual é pequeno; medir na T7 com alguns milhares de linhas fictícias e informar o resultado |
| Abrir diferente no Excel, no Google Planilhas e no LibreOffice | Os testes conferem o formato do arquivo; a abertura em cada programa fica informada como não verificada, a menos que seja feita à mão |
| Planilha com dado pessoal ficar esquecida no computador | Aviso junto do botão; nada é guardado no servidor |
