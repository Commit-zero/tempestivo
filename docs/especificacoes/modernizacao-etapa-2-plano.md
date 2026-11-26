# Etapa 2: plano de tarefas

Plano da [especificação da Etapa 2](modernizacao-etapa-2.md), aprovada em 26/11/2026. **Situação:** plano proposto, aguardando aprovação. Tudo fica na branch `modernizacao/etapa-2-identidade`, sem push antes do fim da final.

## Decisões do plano

| Assunto | Decisão | Motivo |
|---|---|---|
| Fonte | Archivo pelo `next/font/google`, com o eixo `wdth` | O catálogo do Next instalado lista a Archivo com largura de 62 a 125. Falta ver os acentos na tela (T2) |
| Excluir sem JavaScript | O botão visível só abre o diálogo. O botão de confirmar, dentro dele, envia `confirmado`, e a **server action recusa o pedido sem esse campo**. Sem JavaScript, nada é apagado, e um texto diz que é preciso ativá-lo | Hoje, sem JavaScript, exclui sem perguntar. A conferência no servidor é testável |
| Diálogo | `AlertDialog` do pacote `radix-ui`, já instalado | Foco, `Esc` e leitor de tela prontos, sem dependência nova |
| Aviso quando a ação troca de tela ou o item some | O endereço leva `?aviso=<chave>`, de uma lista fixa; um componente mostra a mensagem e limpa o endereço | Funciona como `?senha=redefinida`, que já existe. Sem cookie novo |
| Aviso quando o item continua na tela | A ação devolve a chave, mostrada junto do item. No quadro de tarefas, preservar o foco que já existe | Não muda a rolagem nem o foco sem necessidade |
| Ações que pedem senha | Excluir a conta também passa pelo diálogo. Desativar o segundo fator continua confirmado só pela senha | A exclusão não tem volta; desativar pode ser refeito |
| Carrossel | Não roda sozinho (decidido). Rolagem com `scroll-snap`; os botões entram com JavaScript | Sem temporizador nem botão de pausa |
| Faixa de contagem | Dados do exemplo em um arquivo puro. Um teste junto do módulo `prazos` compara cada dia, o vencimento e a meta com a calculadora | A capa continua sem banco e sem depender de código interno do módulo |

## Ordem e dependências

```text
T1 símbolos (sua escolha) ───────────────────────────────────────────┐
T2 cores e fonte ─ T3 componentes ─┬─ T4 avisos ─ T5 avisos ─┐        │
                                   └─ T6 diálogo ─ T7 diálogo ┤       │
                    T8 faixa ─ T9 capa ─ T10 carrossel ───────┴─ T11 telas ─ T12 símbolo ─ T13 final
```

A escolha do símbolo não trava as tarefas T2 a T11. Cada tarefa é um commit e deixa o app funcionando.

## Bloco A: base e retorno das ações

### T1. Três opções de símbolo
- Aceite: três SVG sem letra, derivados da contagem, mostrados em 16, 32, 180 e 512 px nos dois temas. Nenhum é aplicado.
- Verificação: captura em tela conferida, em especial o tamanho de 16 px.
- Arquivos: `docs/especificacoes/simbolos/` (três SVG e uma página de comparação).
- Depende de: nada (usa as cores da tabela da especificação). Tamanho: P.

### T2. Cores e fonte
- Aceite: tokens da direção A nos dois temas, inclusive bordas, fundos de aviso e foco; Archivo no lugar de Geist e Source Serif 4; âmbar, verde e vermelho só nos significados definidos.
- Verificação: `contraste.test.ts` com todos os pares (escrito antes); captura de telas com acentos.
- Arquivos: `src/app/globals.css`, `src/app/layout.tsx`, `src/test/contraste.test.ts`.
- Depende de: nada. Tamanho: P.

### T3. Componentes de base e aviso único
- Aceite: um componente `Aviso` com os quatro tipos substitui as classes repetidas; botões, campos, cartões e selos seguem a nova hierarquia de cantos e superfícies.
- Verificação: busca sem classes de aviso repetidas; testes de tela atuais.
- Arquivos: `src/components/app/aviso.tsx`, `src/components/formulario.tsx`, `src/components/ui/`, `src/components/app/pagina.tsx` e as telas que repetiam o aviso.
- Depende de: T2. Tamanho: M.

### T4. Aviso depois da ação: base, clientes e processos
- Aceite: lista fixa de chaves; chave desconhecida não mostra nada; o endereço é limpo depois; o aviso é anunciado e fica visível no celular.
- Verificação: teste da lista; teste de tela de criar, salvar, arquivar e excluir.
- Arquivos: `src/lib/avisos.ts` e teste, `src/components/app/aviso-da-pagina.tsx`, `src/app/(app)/layout.tsx`, as ações de clientes e processos.
- Depende de: T3. Tamanho: M.

### T5. Aviso depois da ação: demais telas
- Aceite: prazos (inclusive conferir e cumprir), audiências, honorários, parcelas, tarefas e catálogo respondem a cada ação.
- Verificação: teste de tela por tipo de ação; o foco do quadro de tarefas continua como hoje.
- Arquivos: as ações e telas desses módulos.
- Depende de: T4. Tamanho: M.

### T6. Diálogo de confirmação nas exclusões atuais
- Aceite: nenhum `window.confirm`; foco inicial em "Cancelar"; `Esc` cancela e o foco volta; o botão diz o que apaga; o servidor recusa sem `confirmado`.
- Verificação: teste de tela do diálogo; teste da recusa no servidor.
- Arquivos: `src/components/app/confirmar.tsx`, um primitivo em `src/components/ui/`, as cinco ações de exclusão e os testes que usavam o `confirm`.
- Depende de: T3 e T4. Tamanho: M.

### T7. Diálogo nas outras ações que apagam
- Aceite: excluir tarefa, remover tipo de prazo, excluir dia sem expediente e excluir a conta passam pelo diálogo; antes, conferir se há outra ação que apaga e incluí-la.
- Verificação: testes de tela.
- Arquivos: telas e ações de tarefas, catálogo e conta.
- Depende de: T6. Tamanho: M.

### Ponto de controle A
Lint, tipos, testes com cobertura, build, testes de tela, e revisão de código.

## Bloco B: capa e acabamento

### T8. Faixa de contagem
- Aceite: mostra o exemplo da especificação; cada dia tem texto para leitor de tela; nada informado só por cor; avança uma vez, e aparece completa com "reduzir movimento"; legível em 320 px.
- Verificação: o teste contra a calculadora é escrito antes.
- Arquivos: `src/lib/exemplo-de-contagem.ts`, `src/modules/prazos/__tests__/exemplo-da-capa.test.ts`, `src/components/capa/faixa-de-contagem.tsx`.
- Depende de: T2. Tamanho: M.

### T9. Página inicial
- Aceite: abertura, problemas, soluções, diferenciais, limites e chamada final, com o título e os botões atuais; só o que o sistema faz.
- Verificação: `e2e/home.spec.ts` ampliado, em quatro larguras, com acessibilidade; cada frase conferida com a funcionalidade.
- Arquivos: `src/app/page.tsx`, `src/components/capa/`, `e2e/home.spec.ts`.
- Depende de: T8. Tamanho: M.

### T10. Carrossel
- Aceite: quatro telas com dados fictícios; anterior, próximo e posição; teclado; sem JavaScript, rola e mostra todas.
- Verificação: testes de tela, um deles com JavaScript desligado.
- Arquivos: `src/components/capa/carrossel.tsx`, os slides em `src/components/capa/`, `e2e/home.spec.ts`.
- Depende de: T9. Tamanho: M.

### T11. Demais telas e celular
- Aceite: menus, cabeçalhos, entrada, documentos, 404, carregamento e estados vazios com a identidade; links com 44 px no celular; sem rolagem horizontal em 320 px.
- Verificação: capturas nos dois temas; medição dos alvos de toque nos testes de tela.
- Arquivos: `src/components/app/`, `src/app/(publico)/`, `src/app/(documentos)/`, `src/app/not-found.tsx`, `e2e/acessibilidade.spec.ts`.
- Depende de: T5, T7, T10. Tamanho: M.

### T12. Aplicar o símbolo escolhido
- Aceite: marca, `icon.svg`, `favicon`, ícone da Apple, ícones do manifesto (com o mascarável), cor do tema e imagem de compartilhamento com a faixa.
- Verificação: rodar `pnpm imagens` e conferir cada arquivo na tela.
- Arquivos: `src/components/app/marca.tsx`, `src/app/icon.svg`, `scripts/gerar-imagens.mjs`, `src/app/manifest.ts`, `src/app/layout.tsx` e as imagens geradas.
- Depende de: sua escolha na T1 e da T11. Tamanho: M.

### T13. Documentos e verificação final
- Aceite: README, arquitetura (decisão D13, a identidade) e testes atualizados; os 8 critérios de aceite conferidos.
- Verificação: todos os comandos, `qa-responsivo` e revisão de código.
- Arquivos: `docs/`, `README.md`.
- Depende de: T12. Tamanho: P.

## Publicação, depois da final e com confirmação

Depois da Etapa 1 na `main`. Não há migração: um PR com o código. Depois do merge, conferir a capa, o login e `/api/health`; se falhar, Instant Rollback, observando o aviso da Etapa 1 sobre voltar versão.

## Riscos

| Risco | Mitigação |
|---|---|
| A troca de cores quebrar contraste em algum par não listado | Levantar os pares usados antes de trocar; capturas nos dois temas |
| Faixa de 23 dias ficar ilegível no celular | Quebra em linhas, como na amostra, testada em 320 px |
| Aviso pelo endereço reaparecer ao recarregar sem JavaScript | Aceito: a chave é fixa e não leva dado pessoal |
| Testes atuais dependerem de textos e do `confirm` | Atualizar junto da tarefa que muda o comportamento, sem remover verificação |
| O símbolo ficar ligado a um nome que vai mudar | Sem letra nem nome |
