# 0013. Adotar a identidade Protocolo, com avisos e confirmação

- **Status:** aceito
- **Registrado em:** 2026-11-26

## Contexto

O visual não dizia nada sobre prazo; ações trocavam de tela sem resposta; a exclusão usava `window.confirm` e, sem JavaScript, apagava sem perguntar.

## Decisão

A contagem dia a dia é a peça central (faixa na capa e na imagem de compartilhamento, conferida por teste contra a calculadora). Cores só por token, em `globals.css`: tinta de carimbo na ação; âmbar só pede atenção, verde diz conferido ou concluído, vermelho é atraso, erro ou exclusão. Uma fonte (Archivo) e um componente `Aviso`. Resultado de ação por um cookie de 20 segundos, `tempestivo.aviso`, com uma chave de lista fixa (`src/lib/avisos.ts`). O que apaga passa por um diálogo, e o servidor recusa o envio sem a confirmação (`src/lib/confirmacao.ts`). O carrossel da capa não roda sozinho.

## Consequências

Ação nova que apaga usa `ConfirmacaoDoEnvio` e confere `foiConfirmado` no servidor; ação nova que muda algo chama `avisar`. A confirmação é um campo escondido, nunca um botão de envio, que o Enter acionaria. Sem JavaScript, nada é apagado. O símbolo, o `icon.svg`, o roteiro das imagens e o exemplo da capa são conferidos entre si por `src/test/marca.test.ts`.
