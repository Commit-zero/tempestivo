# 0014. Gerar planilhas na hora, com um só ponto de acesso à biblioteca

- **Status:** aceito
- **Registrado em:** 2026-11-26

## Contexto

O advogado quer somar e filtrar no Excel. A documentação da biblioteca não dizia como tratava fuso, texto iniciado por `=` e caracteres inválidos.

## Decisão

`write-excel-file` (MIT, uma dependência: `fflate`), usada só por `src/lib/planilha.ts`. O módulo `exportacoes` monta cada aba com as mesmas funções de serviço das telas, coluna a coluna. Nada é gravado no servidor. Os testes abrem o arquivo e leem o XML.

## Consequências

Texto digitado é sempre célula de texto; datas são o relógio de São Paulo, qualquer que seja o fuso do servidor; o campo de link da sala virtual e os identificadores não são exportados (o que a pessoa digita em texto livre vai como está). A biblioteca indexa textos num objeto comum, e "constructor" ou "__proto__" corrompiam o arquivo: o app acrescenta um caractere invisível (U+2060) a essas palavras. Toda atualização da biblioteca passa pelas provas de `planilha.test.ts`.
