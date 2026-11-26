# Etapa 1: autenticação reforçada (`autenticacao-reforcada`)

**Situação:** proposta em 25/11/2026, aguardando aprovação. Nenhum código desta etapa foi escrito.

Faz parte do [mapa da modernização](modernizacao.md). A branch `modernizacao/etapa-1-autenticacao` parte da branch da [Etapa 0](modernizacao-etapa-0.md), que ainda não está na `main`. Nada vai para a `main` antes do fim da final de 27/11/2026.

## Objetivo

Uma senha vazada não pode bastar para abrir a conta de quem ativou a verificação em duas etapas. Quem não ativar continua entrando como hoje.

## O que já existe e continua igual

Confirmação de e-mail (sem bloquear o login), recuperação de senha com link de uso único de 1 hora que encerra as sessões, senha de 10 a 128 caracteres com hash Argon2id, limite de tentativas nas telas, mensagens que não revelam se um e-mail tem cadastro e `/api/auth/*` fechada, exceto os dois links de e-mail.

## O que entra

### 1. Confirmação e regras de senha

Valem no cadastro, na redefinição e na troca de senha.

- Campo "Confirme a senha". O servidor recusa quando os dois valores diferem.
- Regras, todas validadas no servidor e mostradas na tela antes do envio:
  1. de 10 a 128 caracteres;
  2. não conter a parte do e-mail antes do `@` (quando ela tiver 4 caracteres ou mais);
  3. não repetir o mesmo caractere ou o mesmo bloco curto do começo ao fim (`aaaaaaaaaa`, `abcabcabcabc`);
  4. não estar numa lista curta de senhas comuns guardada no próprio repositório.
- Sem exigir maiúscula, número ou símbolo (pergunta 1).
- A lista de regras na tela marca o que já foi atendido. Sem JavaScript, ou se a marcação falhar, o servidor recusa do mesmo jeito.
- As regras ficam numa função pura em `src/lib/`, usada pela tela e pelo servidor.
- Quem já tem senha fora das regras novas continua entrando. As regras valem na próxima senha criada.

### 2. Troca de senha com a sessão aberta

Na tela **Conta**: senha atual, nova senha e confirmação. A troca encerra as outras sessões, mantém a atual, tem limite de tentativas e envia um aviso por e-mail.

### 3. Verificação em duas etapas por aplicativo (TOTP)

Plugin `twoFactor` do Better Auth 1.7.27, já instalado ([documentação](https://www.better-auth.com/docs/plugins/2fa)). Opcional para advogados. Não há SMS nem código por e-mail.

**Ativar** (tela Conta):

1. Exige **e-mail confirmado** (ver "Achados", item 1).
2. Pede a senha atual.
3. Mostra o QR code, gerado no nosso servidor, e a chave para digitar à mão. O segredo nunca vai para um serviço externo.
4. A proteção só liga depois que a pessoa digita um código válido do aplicativo.
5. Mostra os 10 códigos de recuperação **uma vez**, depois da confirmação, com opção de copiar. Eles não aparecem de novo.
6. Encerra as outras sessões e envia um aviso por e-mail.

**Entrar:** e-mail e senha levam a uma segunda tela, que aceita o código do aplicativo ou, por um link, um código de recuperação. Enquanto o segundo fator não for aceito, não existe sessão. O passo pendente vale 10 minutos e aceita 5 tentativas. Depois de 10 erros seguidos, o segundo fator da conta fica bloqueado por 15 minutos; essa contagem fica no banco.

**Na tela Conta, com a proteção ligada:** gerar códigos de recuperação novos (pede a senha e invalida os antigos) e desativar (pede a senha, conforme o plano aprovado). Os dois avisam por e-mail.

**Fora desta etapa:** "confiar neste aparelho". O código será pedido em todo login. A sessão continua durando 7 dias, renovada com o uso.

### 4. Avisos por e-mail

Senha trocada ou redefinida, verificação em duas etapas ligada ou desligada, códigos de recuperação gerados de novo e código de recuperação usado. O texto não leva senha, código nem segredo. Falha no envio vai para o log sem o endereço e não desfaz a ação.

### 5. Perda do celular e dos códigos

Não haverá botão nem rota para contornar o segundo fator. O procedimento vai para `docs/operacao.md`: conferir a identidade do titular, remover no banco o segundo fator, encerrar as sessões e exigir senha nova. Mexer no banco de produção continua sendo uma ação do responsável, nunca automática.

## Achados que mudam o desenho

Conferidos no código instalado do Better Auth 1.7.27, além da documentação.

| # | Achado | Tratamento |
|---|---|---|
| 1 | O segundo fator só é cobrado no login por senha. O link de confirmação de e-mail, liberado em `/api/auth/verify-email`, com `autoSignInAfterVerification` **cria sessão sem senha e sem segundo fator** quando o e-mail ainda não está confirmado | Só ativar com e-mail confirmado; para e-mail já confirmado, o link não cria sessão. Um teste prova isso. Qualquer forma de login nova, inclusive troca de e-mail, precisa rever este ponto |
| 2 | A biblioteca aceita o mesmo código do aplicativo mais de uma vez enquanto ele vale (cerca de 90 segundos) | Registrar no banco o código já usado e recusar a repetição, de forma atômica. A forma de guardar sai no plano de tarefas |
| 3 | O bloqueio da conta vale no login, não na confirmação de quem já está logado; o limite do plugin vale só para chamadas HTTP, que ficam fechadas | Limitador próprio em todas as server actions novas, como nas atuais |
| 4 | Com a verificação ligada, `signInEmail` responde `twoFactorRedirect` em vez de erro. O `entrar()` atual trataria isso como login concluído | Tratar a resposta e levar à segunda tela, com teste |
| 5 | O segredo e os códigos de recuperação são cifrados com o `AUTH_SECRET` | Trocar o segredo sem preparo tranca quem usa a verificação. Atualizar `docs/operacao.md` e `docs/deploy.md`, que hoje dizem que a troca só encerra sessões. Conferir na documentação oficial a rotação com segredos versionados |

## Dados e migração

Uma migração só aditiva:

- tabela `twoFactor`: `id`, `userId` (apagada em cascata com o usuário), `secret` e `backupCodes` (cifrados), `verified`, `failedVerificationCount`, `lockedUntil`;
- coluna `user.twoFactorEnabled`, com padrão `false`;
- o que o achado 2 exigir, também aditivo.

Excluir a conta apaga esses dados. A exportação não inclui segredo nem códigos, e um teste garante isso. A política de privacidade passa a citar a verificação em duas etapas, com nova data em `VERSAO_DOS_TERMOS`. A tabela nova não tem RLS, como as outras: a Data API do Supabase continua desligada.

**Ordem de publicação, depois da final:** PR só com a migração, workflow "Migrar o banco de produção" com aprovação, depois o PR com o código. O código novo não funciona sem a coluna.

## Dependência nova

Uma, para desenhar o QR code no servidor: [`uqr`](https://www.npmjs.com/package/uqr) 0.1.3, licença MIT, gratuita, sem dependências (conferido no registro npm em 25/11/2026). A alternativa `qrcode` 1.5.4, também MIT, traz três dependências.

## Estrutura e padrões

| Onde | O que muda |
|---|---|
| `src/lib/` | Regras de senha, funções puras com teste ao lado |
| `src/platform/auth/` | Plugin, casos de uso e limitadores. As telas continuam conhecendo só o `index.ts` |
| `src/app/(publico)/` | Cadastro, redefinição, entrada e a segunda tela |
| `src/app/(app)/conta/` | Seção "Segurança" |
| `prisma/` | Migração e modelo |
| `docs/` | Rotas, modelo de dados, operação, deploy, arquitetura (decisão D12) e `SECURITY.md` |

O código segue o formato atual: server action chama o caso de uso, que valida com zod e devolve resultado com mensagem em português.

```ts
export type ResultadoAuth = { ok: true } | { ok: false; erro: string };
```

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

- **Unidade:** regras de senha.
- **Integração, com Postgres:** os casos dos critérios de aceite, com códigos TOTP gerados no teste.
- **Telas, em 360, 768 e 1280 px, com acessibilidade:** ativar, sair, entrar com código, entrar com código de recuperação e desativar. O e-mail dos testes de tela é falso, então o preparo confirma o e-mail só no banco ou servidor de teste.
- A cobertura continua acima das metas atuais, e os testes que já existem continuam passando.

Antes do PR: agente `revisor-seguranca-lgpd`, `qa-responsivo` e revisão de código.

## Limites

- **Sempre:** validar no servidor, limitar tentativas, usar só dados fictícios, manter `/api/auth/*` fechada.
- **Perguntar antes:** outra dependência, mudança em coluna existente, tornar a verificação obrigatória para advogados.
- **Nunca:** registrar em log senha, código, segredo ou link; enviar o segredo a terceiros; criar atalho que desligue o segundo fator; tocar em produção sem confirmação.

## Fora desta etapa

SMS e código por e-mail; chaves de acesso (passkeys); aparelho confiável; lista e encerramento de sessões por aparelho; troca de e-mail; consulta a serviço externo de senhas vazadas (precisa de uma porta nova em `src/platform/`); limite de tentativas compartilhado entre instâncias no banco (continua a decisão D11); perfil `SUPER_ADMIN` e a obrigatoriedade para ele (Etapa 7, com `painel-do-proprietario`); pedir o código para excluir a conta ou exportar os dados (pergunta 3).

## Critérios de aceite

1. Cadastro, redefinição e troca recusam, no servidor, confirmação diferente e cada regra de senha.
2. A troca de senha exige a atual e derruba as outras sessões.
3. Sem a verificação ligada, o login funciona como hoje.
4. Com ela ligada, e-mail e senha não criam sessão: `/painel` continua pedindo login.
5. Código válido entra; código errado ou repetido não entra.
6. Cada código de recuperação funciona uma única vez, e gerar novos invalida os antigos.
7. Os limites de tentativa e o bloqueio da conta funcionam.
8. Ativar exige e-mail confirmado e a proteção só liga depois de um código válido. Desativar exige a senha.
9. Com a verificação ligada, nenhum link de e-mail cria sessão, e redefinir a senha não desliga o segundo fator.
10. `/api/auth/two-factor/*` responde 404 em GET e POST.
11. Exportação sem segredo nem códigos; excluir a conta apaga o segundo fator.
12. Lint, tipos, testes com cobertura, build e testes de tela passam; documentação atualizada, com o procedimento de perda de acesso.

## Perguntas em aberto

A recomendação vale se a especificação for aprovada sem ressalvas.

1. **Exigir maiúscula, número e símbolo?** Recomendo não: essas exigências levam a senhas previsíveis. As quatro regras acima protegem melhor e são mais fáceis de cumprir.
2. **Quem atende a perda de celular e códigos, e como confere a identidade?** Recomendo: o Vitor, só a pedido vindo do e-mail da conta, com uma segunda confirmação por um contato que a pessoa já tinha, quando houver. O e-mail sozinho não prova identidade, e este continua o ponto mais fraco enquanto não houver outro canal.
3. **Pedir o código também para excluir a conta?** Recomendo não nesta etapa: a exclusão já pede a senha.
