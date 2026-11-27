# 0008. Ler a intimação no próprio servidor, por regras

- **Status:** aceito
- **Registrado em:** 2026-11-18

## Contexto

O projeto proíbe mandar dados reais de clientes para IA gratuita; o texto da intimação tem nomes e números.

## Decisão

Extrator por expressões regulares atrás da porta `ai`, que só gera rascunho, com o trecho de onde saiu cada campo. Um modelo de linguagem entra depois como outro driver, só com dados anonimizados.

## Consequências

Nada sai do servidor; a cobertura de formatos de intimação é menor que a de um modelo.
