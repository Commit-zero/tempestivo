# Etapa 2: identidade visual (`identidade-visual`)

**Situação:** proposta em 26/11/2026, aguardando aprovação. Nenhum código desta etapa foi escrito.

Faz parte do [mapa da modernização](modernizacao.md) (pedidos 1, 2 e 8). A branch `modernizacao/etapa-2-identidade` parte da branch da [Etapa 1](modernizacao-etapa-1.md), porque mexe nas telas que ela criou. Por isso, só pode ser publicada depois dela. Nada vai para a `main` antes do fim da final de 27/11/2026.

## Objetivo

O Tempestivo passa a ter uma identidade própria e uma página inicial que explica, para o advogado autônomo, o problema que resolve e como resolve. Quem usa o app recebe resposta clara para cada ação. Nenhuma funcionalidade some ou muda de regra.

## O que existe hoje

Marca em SVG (cronômetro com sinal de conferido), azul-tinta, papel creme e âmbar, Geist com Source Serif 4, temas claro e escuro com contraste testado. A capa tem título, dois botões, uma prévia de prazo e seis cartões iguais. A exclusão pede confirmação com `window.confirm`. Depois de salvar ou excluir, quase todas as ações só trocam de tela, sem dizer o que aconteceu.

Avaliação: fundo creme, título serifado e destaque âmbar, rótulo em maiúsculas sobre o título e uma grade de cartões iguais formam o visual mais comum de página gerada. Nada disso diz "prazo processual".

## Direção visual

### A ideia: a contagem

O que só o Tempestivo mostra é **como a data foi contada**. A peça central da identidade é a **faixa de contagem**: os dias em sequência, os sem expediente riscados, os úteis numerados, o vencimento marcado e a meta interna antes dele. Ela abre a capa, aparece na imagem de compartilhamento e inspira o símbolo. O resto fica quieto.

O exemplo é fictício e sempre o mesmo: intimação em 12/11/2026, 15 dias úteis, vencimento em 04/12/2026, meta interna em 02/12/2026, com o feriado de 20/11. Um teste compara a faixa com a calculadora do sistema, para a capa nunca mostrar uma conta errada. Ela leva sempre "cálculo auxiliar, confira".

### Cores (direção A, "Protocolo")

A tinta de carimbo de protocolo vira a cor de ação, e **cada cor quente passa a ter um único significado**: âmbar só pede atenção, verde só diz "conferido" e vermelho só diz atraso, erro ou exclusão.

| Papel | Claro | Escuro |
|---|---|---|
| Fundo (branco frio, não creme) | `#F4F6FA` | `#0D1424` |
| Cartão | `#FFFFFF` | `#141D31` |
| Tinta (texto e marca) | `#122240` | `#EEF1F8` |
| Texto de apoio | `#4C5A74` | `#A9B4CB` |
| Carimbo (ação, foco, seleção) | `#4136A8` | `#B3AEFF` |
| Atenção | `#8A5200` | `#F0B455` |
| Conferido | `#146240` | `#6FD3A2` |
| Atraso e exclusão | `#B3261E` | `#FF9A90` |

Contraste de texto calculado em 26/11/2026: o menor par é 5,9:1 no claro e 8,0:1 no escuro (mínimo exigido: 4,5:1). Bordas, fundos de aviso e foco são definidos na implementação e entram no mesmo teste.

A **direção B, "Continuidade"**, mantém azul-tinta, papel e âmbar de hoje e aplica só a faixa de contagem, a nova hierarquia e os componentes. É mais barata e menos diferente.

### Tipografia

Uma família só, **Archivo** (licença OFL, servida pelo próprio app via `next/font`): larga nos títulos, normal no texto e estreita nos números da faixa. Sai a serifa. Antes de adotar, conferir na documentação do `next/font` o eixo de largura e os acentos; se não funcionar, parar e avisar.

### Símbolo

O nome do produto é provisório (falta conferir INPI e Registro.br). Por isso o símbolo **não pode depender de letra nem do nome**. A primeira tarefa entrega **três opções** em SVG, nos tamanhos 16, 32, 180 e 512 px, nos dois temas, a partir da contagem (dias em sequência e o último conferido). Nada é aplicado antes de uma delas ser escolhida. Escolher o símbolo não resolve a questão do nome.

### Layout

- Alinhamento à esquerda, linhas de texto com até 70 caracteres.
- Hierarquia de superfícies: a faixa e as ações principais se destacam; listas e textos não precisam de caixa. Cantos e sombras deixam de ser iguais em tudo.
- Saem o rótulo em maiúsculas sobre o título e as frases unidas por "·" na capa.
- Movimento: um só momento automático, a contagem avançando uma vez na abertura da capa. Com "reduzir movimento", a faixa já aparece completa.

## Página inicial

Nesta ordem:

1. **Abertura:** o título atual ("Nunca perca um prazo e receba seus honorários."), os dois botões atuais e a faixa de contagem.
2. **Problemas:** contar prazo com feriado e suspensão; achar que alguém já conferiu; descobrir o vencimento tarde demais; não saber quem está devendo.
3. **Soluções:** cada problema ligado ao que o sistema faz hoje.
4. **Carrossel** com quatro telas do produto, com dados fictícios: prazo com a contagem, painel do dia, honorários com cobrança pronta e agenda no celular. As telas são componentes do próprio app, não fotos, para não envelhecerem.
5. **Diferenciais:** contagem explicada; status honesto; o leitor de intimação só sugere e não envia o texto a terceiros; aviso ao substituto.
6. **Limites e chamada final:** o cálculo é auxiliar, não há integração com tribunais e, na fase de testes, só dados fictícios.

Regras de conteúdo: só o que o sistema faz; nada de depoimento, número de clientes ou selo inventado; nada do roadmap. A verificação em duas etapas só é citada se a Etapa 1 estiver na mesma publicação.

**Carrossel**, sem dependência nova e seguindo o [padrão do WAI-ARIA](https://www.w3.org/WAI/ARIA/apg/patterns/carousel/): sem JavaScript, os slides continuam acessíveis por rolagem; com JavaScript, há botões de anterior, próximo e pausar, e indicação de posição. Pelo plano aprovado, roda sozinho (ver a pergunta 2), mas para com o ponteiro ou o foco em cima, depois de qualquer interação e quando a página não está visível; com "reduzir movimento", não roda.

## Confirmações e avisos (pedido 8)

- **Diálogo de confirmação** próprio no lugar do `window.confirm`, com o componente de diálogo do pacote `radix-ui`, já instalado. Diz o que será apagado, tem o foco inicial em "Cancelar" e o botão com o nome da ação ("Excluir cliente"). Sem JavaScript, a ação destrutiva não é enviada sem confirmação. Hoje é; a forma de garantir isso sai no plano.
- **Aviso de resultado** depois de salvar, excluir ou mudar situação, inclusive quando a ação troca de tela. Usa o mesmo verbo do botão ("Excluir cliente" → "Cliente excluído"), é anunciado por leitor de tela e não some antes de poder ser lido. O endereço ou o cookie que leva o aviso carrega só uma chave de uma lista fixa, nunca nome ou texto.
- **Quatro tipos** (sucesso, erro, atenção e informação) com um componente só, no lugar das classes repetidas.
- Estados vazios e de carregamento revisados com a nova identidade.

## Resto do app

As cores e a tipografia entram pelos tokens de `src/app/globals.css`. Revisar menus (lateral e barra inferior), cabeçalhos, botões, campos, listas, selos de prazo, telas de entrada, documentos, página 404, ícones, `favicon`, manifesto, cor do tema e imagem de compartilhamento (`pnpm imagens`). Os alvos de toque pequenos nos links antigos, apontados no QA da Etapa 1, passam a ter 44 px no celular. Os e-mails continuam em texto puro.

"Modernizar CSS e JavaScript" é organizar os tokens e componentes tocados, sem trocar de tecnologia nem reescrever o que não muda.

## Estrutura e padrões

| Onde | O que muda |
|---|---|
| `src/app/globals.css` | Tokens |
| `src/components/ui/` | Primitivos, inclusive o diálogo |
| `src/components/app/` | Marca, navegação, página, avisos, confirmação |
| `src/components/capa/` (novo) | Faixa de contagem, carrossel e seções |
| `src/app/page.tsx` | Compõe a capa |
| `scripts/gerar-imagens.mjs`, `public/icones/` | Imagens da marca |
| `src/test/contraste.test.ts` | Pares novos de cor |

Cor só por token, nunca fixa no componente (exceção: o símbolo). Componentes de servidor por padrão; cliente só onde há interação.

```tsx
<Aviso tipo="sucesso">Cliente excluído.</Aviso>
```

Nenhum módulo, rota de dados, regra de prazo ou migração muda. Nenhuma dependência nova.

## Testes

Teste antes do código para o que tem comportamento. Comandos:

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

- **Unidade:** contraste de todos os pares nos dois temas; dados da faixa iguais aos da calculadora; lista de chaves de aviso.
- **Telas, em 320, 360, 768 e 1280 px, com acessibilidade e sem rolagem horizontal:** capa, carrossel (teclado, pausa e movimento reduzido), diálogo (cancelar, confirmar, `Esc`, volta do foco) e aviso depois de cada tipo de ação.
- Os testes atuais continuam valendo; os que usam `window.confirm` passam a usar o diálogo.
- Antes do PR: `qa-responsivo` e revisão de código; `revisor-seguranca-lgpd` se o aviso usar cookie.

## Limites

- **Sempre:** dados fictícios, "cálculo auxiliar, confira" junto de qualquer prazo, os dois temas e os textos em português.
- **Perguntar antes:** dependência nova, mudar texto dos termos ou da privacidade, mudar o nome do produto.
- **Nunca:** recurso que não funciona ou conteúdo inventado na capa; script, fonte ou imagem carregados de terceiros pelo navegador (a CSP continua `'self'`); informação só por cor.

## Fora desta etapa

Nome definitivo e registro de marca; escolha manual de tema (continua seguindo o sistema); e-mails em HTML; animações além da contagem; fotos e ilustrações de banco; métricas de acesso; reorganização dos menus ou dos fluxos; planilhas (Etapa 3).

## Critérios de aceite

1. Um dos três símbolos escolhido e aplicado em marca, `favicon`, ícones, manifesto e imagem de compartilhamento.
2. Cores e tipografia novas em todas as telas, nos dois temas, com o teste de contraste passando.
3. Capa com as seis partes, só com o que o sistema faz; a faixa confere com a calculadora.
4. Carrossel operável por teclado e utilizável sem JavaScript. Se rodar sozinho: com pausa e sem rotação para quem pede menos movimento.
5. Nenhum `window.confirm`; toda ação destrutiva passa pelo diálogo.
6. Salvar, excluir e mudar situação mostram o resultado, sem dado pessoal no endereço ou no cookie.
7. Sem rolagem horizontal em 320, 360, 768 e 1280 px; alvos de toque de 44 px no celular.
8. Lint, tipos, testes com cobertura, build e testes de tela passam; documentação atualizada. Informar o que não foi verificado, como leitor de tela, celular físico e desempenho medido.

## Perguntas em aberto

A recomendação vale se a especificação for aprovada sem ressalvas.

1. **Direção A ("Protocolo") ou B ("Continuidade")?** Recomendo a A. A amostra enviada junto compara as duas.
2. **Rodar o carrossel sozinho?** O plano aprovado previa rotação com pausa. Recomendo **mudar** e não rodar sozinho: quem lê no próprio ritmo entende mais, há menos código e menos barreira de acessibilidade. Se não quiser mudar o plano, vale a rotação descrita acima.
3. **Fazer o símbolo agora, com o nome provisório?** Recomendo sim, sem letra nem nome, para sobreviver a uma troca.
