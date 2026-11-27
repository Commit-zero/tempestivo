# Como contribuir

Para configurar o ambiente, siga [Rodar o projeto na sua máquina](docs/guias/desenvolvimento-local.md).

O Tempestivo tem [licença proprietária](LICENSE). Quem não é da equipe precisa combinar com os autores os direitos sobre a contribuição antes de enviá-la.

## Regras que valem sempre

1. **Custo zero.** Nada que exija cartão, plano pago ou serviço pago.
2. **Português do Brasil** em telas, mensagens e commits. Datas em `dd/mm/aaaa`, fuso `America/Sao_Paulo`.
3. **Todo registro pertence a uma conta.** Todo método de repositório recebe `contaId` como primeiro parâmetro. Nunca consulte por id sem filtrar pela conta. O `contaId` vem da sessão, nunca do formulário ou da URL.
4. **A leitura da intimação só sugere.** O prazo só existe depois da confirmação do advogado.
5. **Prazo calculado é auxiliar.** A tela diz "cálculo auxiliar, confira".
6. **Só dados fictícios** em demonstração, testes e em qualquer serviço externo de IA.
7. **Portabilidade.** Tudo externo fica atrás de uma interface em `src/platform/`. Nada exclusivo de um provedor de hospedagem.
8. **Mobile-first.** Toda tela funciona em 360, 768 e 1280 px.
9. **Configuração só por variáveis de ambiente**, validadas na subida. Nunca versione um segredo.

As fronteiras entre camadas são impostas pelo lint (ver a [visão geral da arquitetura](docs/arquitetura/visao-geral.md)).

## Fluxo de trabalho

1. Crie um branch curto a partir da `main`.
2. Em mudança grande, descreva antes o objetivo e os critérios de aceite no pull request ou numa issue. Decisão difícil de reverter vira um [ADR](docs/adr/README.md).
3. Trabalhe em fatias pequenas, com o teste primeiro no domínio. Um defeito começa por um teste que falha.
4. Faça um commit por fatia, com a mensagem em português no imperativo.
5. Antes de abrir o pull request:

   ```bash
   pnpm verificar
   ```

   ```bash
   pnpm e2e
   ```

6. Abra o pull request, preencha o modelo e peça revisão à outra pessoa da equipe.

> **Todo merge na `main` publica em produção.** Faça o merge só com os checks aprovados.

## Definição de pronto

- [ ] Os critérios de aceite foram atendidos e o comportamento foi exercitado, não só compilado.
- [ ] Há teste para o comportamento novo, e os testes existentes passam. Nenhum teste foi desativado ou enfraquecido.
- [ ] Os casos de erro e de borda estão tratados.
- [ ] Lint, tipos, testes e build passam.
- [ ] Segurança e privacidade foram consideradas quando a mudança toca entrada de usuário, autenticação ou dados pessoais.
- [ ] Tela nova ou alterada funciona nas três larguras e entra no teste de acessibilidade.
- [ ] A documentação foi atualizada no mesmo pull request.
- [ ] O que não foi verificado está dito no pull request.

## Mudanças no banco

1. Altere `prisma/schema.prisma` e gere a migração com `pnpm db:migrar --name <nome>`.
2. Toda migração precisa funcionar com o código que já está no ar: acrescente; para renomear ou remover, faça em duas entregas.
3. **Se o código novo depende da migração, a migração vai primeiro**, num pull request próprio, seguida do workflow **Migrar o banco de produção**. Como o merge publica antes de a migração rodar, marque os campos novos com `@ignore` nesse primeiro pull request (e os modelos novos com `@@ignore`); o pull request do código retira as marcas.

Detalhes em [como mudar o esquema](docs/arquitetura/modelo-de-dados.md#como-mudar-o-esquema).

## Regras de prazo

O prazo perdido é o pior erro possível no produto.

- A calculadora é uma função pura: sem banco, relógio ou rede. Datas são civis (`AAAA-MM-DD`).
- Cada regra tem referência legal, teste e situação (`pendente` ou `validada`) em [`regras.ts`](src/modules/prazos/dominio/regras.ts), com o espelho em [`regras.md`](src/modules/prazos/regras.md).
- Uma regra só passa a `validada` com a conferência de um advogado registrada nos casos de [`casos-validados.json`](src/modules/prazos/__fixtures__/casos-validados.json). Nunca altere um caso validado para um teste passar.
- Na dúvida, a calculadora recusa e pede a data manual.

## Dependências

Antes de adicionar uma, confira a licença (permissiva; copyleft pede decisão à parte, porque o produto é proprietário), o custo (zero), a manutenção e o que ela traz junto. Registre a conferência no pull request. Código copiado de terceiros entra em [AVISOS-DE-TERCEIROS.md](AVISOS-DE-TERCEIROS.md).

## Segurança

Não abra issue pública sobre vulnerabilidade. Siga a [política de segurança](SECURITY.md).
