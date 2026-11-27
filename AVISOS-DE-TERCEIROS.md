# Avisos de terceiros

O Tempestivo é [proprietário](LICENSE), mas usa trabalho de terceiros, que continua sob as licenças deles.

## Código copiado para este repositório

Os componentes em `src/components/ui/` partem do [shadcn/ui](https://github.com/shadcn-ui/ui) e foram adaptados.

```text
MIT License

Copyright (c) 2023 shadcn

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Fonte

[Archivo](https://github.com/Omnibus-Type/Archivo), sob a SIL Open Font License 1.1. O `next/font` baixa os arquivos no build, e o próprio app os entrega.

## Dependências

As bibliotecas são instaladas pelo gerenciador de pacotes, cada uma com a sua licença. Entre as de produção, a maioria é MIT, Apache-2.0 ou ISC. Merecem registro:

| Pacote | Licença | Observação |
| --- | --- | --- |
| `sharp` e as bibliotecas nativas `@img/*` (libvips) | Apache-2.0 e LGPL-3.0-or-later | trazidas pelo Next.js para imagens. Quem distribuir a imagem Docker precisa cumprir a LGPL |
| `caniuse-lite` | CC-BY-4.0 | dados de compatibilidade de navegadores, com atribuição ao projeto Can I use |
| `nodemailer` | MIT-0 | envio de e-mail |
| `source-map-js` | BSD-3-Clause | |
| `tslib` | 0BSD | |

Para a lista completa e atual:

```bash
pnpm licenses list --prod
```
