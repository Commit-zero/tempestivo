# Etapa 1: plano de tarefas

Plano da [especificação da Etapa 1](modernizacao-etapa-1.md), aprovada em 25/11/2026. **Situação:** plano aprovado em 25/11/2026; bloco A pronto na branch (ver "Andamento"). Tudo fica na branch `modernizacao/etapa-1-autenticacao`, sem push antes do fim da final.

## Decisões do plano

| Assunto | Decisão | Motivo |
|---|---|---|
| Código do aplicativo repetido | Depois que o Better Auth aceita o código, gravar na tabela `verification` uma linha com `id` derivado do usuário e do código, com validade de 2 minutos. Se o `id` já existe, apagar a sessão recém-criada e recusar | A chave primária faz o "primeiro vence" mesmo com dois envios ao mesmo tempo e entre instâncias. Não muda o banco. Antes de aceitar o código não dá para saber, no login, de quem ele é. As linhas vencidas do usuário são apagadas a cada novo registro |
| Fluxos do servidor nos testes | Um apoio de teste substitui `next/headers` por um pote de cookies em memória, para exercitar login, cookies e sessão contra o Postgres | Hoje só a confirmação de senha tem teste de integração. É o maior risco, por isso é a primeira coisa da T6 |
| Confirmar e-mail no teste de tela | Assinar o link com o `AUTH_SECRET` falso do Playwright e abrir `/api/auth/verify-email` | Passa pela rota real e não acessa o banco por fora |
| Código TOTP no teste de tela | Gerar com `node:crypto` a partir da chave mostrada na tela | Não adiciona dependência e confere a compatibilidade com o padrão (RFC 6238) |
| Encerrar outras sessões ao ativar | Apagar as sessões do usuário, menos a recém-criada | O plugin troca a sessão atual durante a ativação, então o cookie da requisição já está velho |
| Rotação do `AUTH_SECRET` | Nesta etapa, só documentar o risco e o que fazer. O Better Auth instalado tem segredos versionados (`BETTER_AUTH_SECRETS`), mas adotá-los fica como evolução | A variável é lida direto pela biblioteca, fora da validação com zod, e exige desenho próprio |

## Ordem e dependências

```text
T1 regras ─ T2 cadastro e redefinição ─┬─ T4 troca de senha
                          T3 avisos ───┘
T5 migração ─ T6 login com 2º fator ─ T7 segunda tela ─ T8 ativar ─ T9 gerenciar ─ T10 telas ─ T11 documentos
```

T3 também é usada por T8 e T9. Cada tarefa é um commit, com o teste escrito antes, e deixa o app funcionando. Ninguém consegue ligar a verificação antes da T8, quando o login já a respeita.

## Bloco A: senhas

### T1. Regras de senha
- Aceite: função pura que devolve cada regra e se foi atendida (tamanho, nome do e-mail, repetição, senha comum), com a lista comum no repositório.
- Verificação: testes de unidade, com os limites (9, 10, 128 e 129 caracteres; e-mail com 3 e 4 caracteres antes do `@`).
- Arquivos: `src/lib/regras-de-senha.ts`, `src/lib/regras-de-senha.test.ts`.
- Depende de: nada. Tamanho: P.

### T2. Confirmação e regras no cadastro e na redefinição
- Aceite: o servidor recusa confirmação diferente e senha fora das regras; a tela mostra as regras e marca as atendidas.
- Verificação: testes de integração dos casos de uso; testes de tela do cadastro nas três larguras. Os testes de tela atuais passam a preencher a confirmação.
- Arquivos: `src/platform/auth/acoes.ts`, `src/app/(publico)/acoes.ts`, `src/app/(publico)/formularios.tsx`, `src/components/regras-de-senha.tsx`, `e2e/apoio.ts` e `e2e/conta.spec.ts`.
- Na redefinição, a regra do nome do e-mail precisa do usuário dono do link: conferir na documentação se dá para obtê-lo sem gastar o link. Se não der, parar e ajustar a especificação.
- Depende de: T1. Tamanho: M.

### T3. Avisos de segurança por e-mail
- Aceite: um só ponto monta e envia os avisos; a redefinição concluída já avisa; falha de envio vai para o log sem endereço e não desfaz a ação.
- Verificação: testes com o e-mail falso, inclusive falha de envio e ausência de senha, código e link no texto.
- Arquivos: `src/platform/auth/avisos.ts`, `src/platform/auth/avisos.test.ts`, `src/platform/auth/auth.ts`.
- Depende de: nada. Tamanho: P.

### T4. Troca de senha na tela Conta
- Aceite: exige a senha atual, aplica as regras, encerra as outras sessões, mantém a atual, limita tentativas e avisa.
- Verificação: integração (senha atual errada, limite, outra sessão derrubada) e teste de tela.
- Arquivos: `src/platform/auth/acoes.ts` (e `index.ts`), `src/app/(app)/conta/acoes.ts`, `src/app/(app)/conta/seguranca.tsx`, `src/app/(app)/conta/page.tsx`.
- Depende de: T2, T3. Tamanho: M.

### Ponto de controle A
Lint, tipos, testes com cobertura, build, testes de tela e revisão com `revisor-seguranca-lgpd`. O bloco A pode ser publicado sozinho, sem migração.

## Bloco B: verificação em duas etapas

### T5. Migração
- Aceite: tabela `twoFactor` e coluna `user.twoFactorEnabled` conforme o esquema do plugin; só acrescenta; excluir o usuário apaga a linha; a exportação não traz segredo nem códigos.
- Verificação: migração aplicada em banco vazio e em banco com dados; testes de exclusão e de exportação.
- Arquivos: `prisma/schema.prisma`, a pasta da migração, `src/modules/conta/conta.test.ts`.
- Commit separado, para virar o PR só de migração depois da final.
- Depende de: nada. Tamanho: P.

### T6. Login com segundo fator, no servidor
- Aceite: o plugin entra antes de `nextCookies()`; sem a verificação, o login não muda; com ela, `entrar()` pede o segundo fator e não cria sessão; código válido ou de recuperação entra; código repetido não entra; limites e bloqueio funcionam.
- Verificação: integração com o pote de cookies, ligando a verificação direto pela API da biblioteca; `/api/auth/two-factor/*` responde 404 em GET e POST; com a verificação ligada, o link de e-mail não cria sessão e a redefinição não a desliga.
- Arquivos: `src/platform/auth/auth.ts`, `src/platform/auth/segundo-fator.ts` e seu teste, `src/test/cookies.ts`, `src/platform/auth/index.ts`.
- Depende de: T3, T5. Tamanho: M.

### T7. Segunda tela da entrada
- Aceite: depois da senha, a pessoa vai para `/entrar/codigo`; pode alternar para código de recuperação; passo vencido ou esgotado volta ao login com uma mensagem; usar código de recuperação avisa por e-mail.
- Verificação: tipos, build e testes de ação. O teste de tela completo vem na T10, quando existir a ativação.
- Arquivos: `src/app/(publico)/entrar/codigo/page.tsx`, `src/app/(publico)/acoes.ts`, `src/app/(publico)/formularios.tsx`, `docs/rotas-e-api.md`.
- Depende de: T6. Tamanho: M.

### T8. Ativar na tela Conta
- Aceite: exige e-mail confirmado e senha; mostra QR code local e chave; só liga com código válido; mostra os códigos de recuperação uma vez; encerra as outras sessões; avisa.
- Verificação: integração (e-mail não confirmado, senha errada, código errado, limite, ativação abandonada e retomada). Antes de usar `uqr`, ler a documentação e conferir de novo versão e licença.
- Arquivos: `src/platform/auth/segundo-fator.ts`, `src/app/(app)/conta/acoes.ts`, `src/app/(app)/conta/seguranca.tsx`, `package.json` e `pnpm-lock.yaml`.
- Depende de: T7. Tamanho: M.

### T9. Códigos novos e desativação
- Aceite: os dois pedem a senha, têm limite e avisam; códigos antigos deixam de valer; desativar apaga o segredo.
- Verificação: integração.
- Arquivos: `src/platform/auth/segundo-fator.ts` e teste, `src/app/(app)/conta/acoes.ts`, `src/app/(app)/conta/seguranca.tsx`.
- Depende de: T8. Tamanho: P.

### T10. Fluxo completo nas telas
- Aceite: ativar, sair, entrar com código, entrar com código de recuperação (e recusar o reuso) e desativar, em 360, 768 e 1280 px, sem rolagem horizontal e passando na verificação de acessibilidade.
- Verificação: `corepack pnpm e2e`.
- Arquivos: `e2e/seguranca.spec.ts`, `e2e/totp.ts`, `e2e/apoio.ts`, `e2e/acessibilidade.spec.ts`.
- Usa conta própria, sem mexer na sessão compartilhada pelos outros testes.
- Depende de: T9. Tamanho: M.

### T11. Documentos e política de privacidade
- Aceite: operação com o procedimento de perda de acesso (quem atende e como confere a identidade) e o efeito de trocar o `AUTH_SECRET`; deploy, modelo de dados, arquitetura (D12), `SECURITY.md` e README atualizados; política de privacidade cita a verificação, com nova `VERSAO_DOS_TERMOS`.
- Verificação: busca por textos antigos sobre o `AUTH_SECRET`; o teste de aceite dos termos passa. O procedimento é ensaiado no banco local.
- Arquivos: `docs/`, `SECURITY.md`, `README.md`, `src/app/(documentos)/privacidade/page.tsx`, `src/lib/termos.ts`.
- Depende de: T10. Tamanho: M.

### Ponto de controle final
Os 12 critérios de aceite da especificação conferidos um a um; lint, tipos, testes com cobertura, build e testes de tela; `revisor-seguranca-lgpd`, `qa-responsivo` e revisão de código; resumo do que ficou pronto, do que ficou de fora e por quê.

## Andamento

**Bloco A (T1 a T4), pronto em 25/11/2026.** Passaram: lint, tipos, 426 testes com cobertura acima das metas, build e 118 testes de tela (Edge).

- O apoio de teste com cookies simulados, previsto para a T6, entrou já na T2.
- Na redefinição, deu para identificar o dono do link sem gastá-lo.
- O teste de tela da T4 achou um erro que a simulação não pega: depois da troca, o Next atualiza `cookies()` mas não `headers()`, e a pessoa parecia deslogada. `sessao.ts` passou a ler os cookies atuais. A T8 depende disso.
- A revisão de segurança apontou sete itens. Foram corrigidos seis: limite de avisos por trocas repetidas, links de redefinição pendentes, mensagem de falha, tempo máximo do SMTP, montagem do cabeçalho de cookies e quebra de linha no nome. As correções não passaram por uma segunda revisão.
- **Aberto, depende de decisão:** com o e-mail ainda não confirmado, o link de confirmação (24 horas) cria sessão sem senha, mesmo depois de uma troca de senha. Comportamento anterior à etapa. A saída é `autoSignInAfterVerification: false`, que faz quem confirmar o e-mail em outro aparelho ter de entrar com a senha.
- **Também aberto:** o Better Auth não troca a senha em uma transação só (`transaction: true` precisa de teste próprio); falta teste de login simultâneo à troca; o limite continua por instância (D11).
- Antes do PR do bloco A: rodar `qa-responsivo`.

## Publicação, depois da final e com confirmação

Depende de a Etapa 0 já estar na `main`.

1. PR do bloco A, se for publicado antes.
2. PR só com a migração (T5); depois do merge, rodar "Migrar o banco de produção" com aprovação.
3. PR com o código (T6 a T11); depois do merge, conferir `/api/health` e testar o login. Se falhar, Instant Rollback. A migração só acrescenta, então o código anterior continua funcionando.

Voltar para o código anterior depois que alguém ligar a verificação faz o login dessa pessoa dispensar o segundo fator. Nesse caso, preferir corrigir para a frente e avisar quem foi afetado.

## Riscos

| Risco | Mitigação |
|---|---|
| Os testes com cookies simulados não baterem com o Next de verdade | A T10 repete o fluxo no navegador |
| Atualização do Better Auth mudar o comportamento conferido no código | Versão travada no lockfile; os testes dos achados 1, 2 e 4 quebram se mudar |
| Relógio do celular errado | O código aceita uma janela de 30 segundos para cada lado; a tela pede para conferir a hora automática |
| Alguém perder celular e códigos | Mensagem clara ao mostrar os códigos e procedimento manual |
| Limite em memória em várias instâncias | O bloqueio do segundo fator no login fica no banco; o resto continua a decisão D11 |
