# Rotas e interfaces

O Tempestivo não tem API JSON pública. A interface com o navegador são as **páginas** (Server Components) e as **Server Actions**. Fora delas, há poucas rotas HTTP, cada uma com um consumidor conhecido: o agendador, o monitor de saúde, o app de calendário e os links dos e-mails.

## Páginas

| Grupo | Rota | Acesso | Observação |
|---|---|---|---|
| Pública | `/` | livre | Apresentação, com prévia fictícia |
| Pública | `/entrar`, `/cadastro`, `/recuperar-senha`, `/redefinir-senha` | livre | Limitadores de tentativa nas actions |
| Documentos | `/termos`, `/privacidade` | livre | Versão em `src/lib/termos.ts` |
| Link de e-mail | `/conferir/[token]` | token de uso único | Mostra o prazo; confirmar exige clique (POST) |
| Link de e-mail | `/substituto/[token]` | token de uso único | Aceite do convite do substituto |
| Área logada | `/painel` | sessão | O que pede atenção hoje |
| Área logada | `/prazos`, `/prazos/novo`, `/prazos/[id]`, `/prazos/[id]/editar`, `/prazos/catalogo`, `/prazos/intimacao` | sessão | |
| Área logada | `/processos`, `/processos/novo`, `/processos/[id]`, `/processos/[id]/editar` | sessão | |
| Área logada | `/clientes`, `/clientes/novo`, `/clientes/[id]` | sessão | |
| Área logada | `/honorarios`, `/honorarios/novo`, `/honorarios/[id]` | sessão | |
| Área logada | `/audiencias`, `/audiencias/nova`, `/audiencias/[id]` | sessão | |
| Segundo fator | `/entrar/codigo` | passo pendente (cookie) | Código do aplicativo ou de recuperação; sem passo pendente, volta a `/entrar` |
| Confirmação de e-mail | `/email-confirmado` | — | Destino do link de confirmação, que não abre sessão |
| Área logada | `/tarefas`, `/conta`, `/mais` | sessão | `/mais` é o menu do celular |

A área logada fica no grupo `src/app/(app)`, cujo `layout.tsx` chama `exigirSessao()`: sem sessão, redireciona para `/entrar`. Cada página e cada action chamam `exigirSessao()` de novo para obter o `contaId`, e o `contaId` nunca vem do formulário nem da URL.

Um id de outra conta na URL (`/prazos/<id-de-outra-conta>`) dá 404, igual a um id inexistente: o repositório filtra por `contaId`, e a página chama `notFound()`.

## Rotas HTTP

| Método e rota | Autenticação | Resposta | Consumidor |
|---|---|---|---|
| `GET /api/health` | nenhuma | `200 {"status":"ok","banco":"ok"}` ou `503 {"status":"erro","banco":"erro"}`, `no-store` | Monitor, `HEALTHCHECK` do Docker, CI |
| `GET` ou `POST /api/jobs/alertas` | `Authorization: Bearer $JOBS_SECRET` | `200 {ok, ...resumo}`; `502` se algum envio falhou; `401`; `500` | `jobs.yml` (a cada 2 horas) |
| `GET` ou `POST /api/jobs/ping` | `Authorization: Bearer $JOBS_SECRET` | `200 {ok:true}`; `503` sem banco; `401` | `jobs.yml`; mantém o banco gratuito ativo |
| `GET /api/auth/reset-password/<token>` | token do e-mail | redireciona para `/redefinir-senha` | Link do e-mail de redefinição |
| `GET /api/auth/verify-email?token=...` | token do e-mail | confirma o e-mail e redireciona | Link do e-mail de confirmação |
| qualquer outra `/api/auth/*` | — | `404` | Fechada de propósito (decisão D6) |
| `GET /agenda/<token>/calendario.ics` | token secreto da agenda | `200 text/calendar`, `no-store`; `404 "Agenda não encontrada."`; `429` acima de 60 por IP a cada 15 min | App de calendário |
| `GET /audiencias/<id>/agenda.ics` | sessão | `200 text/calendar` (anexo); `401`; `404` | Botão "Adicionar à agenda" |
| `GET /conta/exportar` | sessão | `200 application/json` (anexo), `private, no-store`; `401` | Link "Exportar os dados" em Conta (LGPD) |

### Contrato do agendador

```bash
curl -fsS -X POST -H "Authorization: Bearer $JOBS_SECRET" "$APP_URL/api/jobs/alertas"
```

- O segredo é comparado em tempo constante (`timingSafeEqual` sobre o SHA-256 dos dois lados).
- O job é idempotente: pode ser chamado de novo, ou por dois agendadores ao mesmo tempo, sem duplicar e-mail.
- O corpo da resposta traz só contadores, nunca dados de prazo ou de cliente.
- Qualquer cron que faça `POST` com o cabeçalho substitui o GitHub Actions.

### Contrato da agenda

- O token tem 43 caracteres base64url (256 bits). Formato inválido responde 404 sem consultar o banco.
- Token trocado, desligado ou inexistente: 404, com a mesma mensagem, para não revelar qual é o caso.
- O conteúdo segue a RFC 5545 e a [especificação da agenda](especificacoes/agenda.md).

## Server Actions

Toda escrita do app passa por uma Server Action em `src/app/**/acoes.ts`. O Next.js gera ids de action não adivinháveis, só aceita POST da mesma origem e a CSP limita `form-action` a `'self'`.

Padrão de uma action:

```ts
// src/app/(app)/conta/acoes.ts
export async function acaoDefinirMargem(_anterior: EstadoDoFormulario, formulario: FormData): Promise<EstadoDoFormulario> {
  const { contaId } = await exigirSessao();                                     // 1. quem é
  const valores = { margem: String(formulario.get("margem") ?? "") };
  const resultado = await definirMargemDeSeguranca(contaId, formulario.get("margem")); // 2. o serviço valida com zod
  if (!resultado.ok) return { erro: resultado.erro, valores };                  // 3. erro em português, valores mantidos
  revalidatePath("/conta");                                                     // 4. atualiza as telas afetadas
  revalidatePath("/prazos");
  revalidatePath("/painel");
  return { aviso: "Margem salva. A meta interna dos prazos já foi recalculada.", valores };
}
```

Regras:

1. A action só faz a ponte: sessão, `FormData` → objeto simples, chamada ao serviço, `revalidatePath` ou `redirect`. Validação e regra de negócio ficam no serviço.
2. Os serviços devolvem `Resultado<T>` (`{ ok: true, valor }` ou `{ ok: false, erro }`, em `src/lib/resultado.ts`). Erro esperado não lança exceção.
3. O estado do formulário é `EstadoDoFormulario` (`src/lib/formulario.ts`): `erro`, `aviso` e os `valores` digitados, para o formulário não se perder.
4. Mensagens de erro em português, dizendo o que fazer ("Use no máximo 10 dias úteis."), nunca detalhes técnicos.

| Arquivo | Actions |
|---|---|
| `(publico)/acoes.ts` | `acaoEntrar`, `acaoCadastrar`, `acaoPedirRedefinicao`, `acaoRedefinirSenha` |
| `(app)/acoes.ts` | `acaoSair`, `acaoReenviarConfirmacao` |
| `(app)/prazos/acoes.ts` | `acaoPreverPrazo`, `acaoSalvarPrazo`, `acaoConfirmarConferencia`, `acaoMarcarComoCumprido`, `acaoDesfazerCumprido`, `acaoExcluirPrazo`, `acaoAjustarTipo`, `acaoCriarTipo`, `acaoRemoverTipo`, `acaoCadastrarDiaSemExpediente`, `acaoExcluirDiaSemExpediente` |
| `(app)/prazos/intimacao/acoes.ts` | `acaoLerIntimacao` (só devolve rascunho; não grava) |
| `(app)/processos/acoes.ts` | `acaoSalvarProcesso`, `acaoMudarStatusDoProcesso`, `acaoExcluirProcesso` |
| `(app)/clientes/acoes.ts` | `acaoSalvarCliente`, `acaoExcluirCliente` |
| `(app)/honorarios/acoes.ts` | `acaoCriarHonorario`, `acaoDefinirPagamento`, `acaoExcluirHonorario` |
| `(app)/audiencias/acoes.ts` | `acaoSalvarAudiencia`, `acaoExcluirAudiencia` |
| `(app)/tarefas/acoes.ts` | `acaoCriarTarefa`, `acaoMoverTarefa`, `acaoExcluirTarefa` |
| `(app)/conta/acoes.ts` | `acaoSalvarConta`, `acaoExcluirConta` (pede a senha), `acaoDefinirMargem`, `acaoAtivarAgenda`, `acaoDesativarAgenda`, `acaoTrocarSenha` (pede a senha atual) |
| `conferir/[token]/acoes.ts` | `acaoConfirmarPeloLink` |
| `substituto/[token]/acoes.ts` | `acaoAceitarConvite` |

## API pública dos módulos

Cada módulo expõe só o que está no seu `index.ts`. É essa a interface que as telas e os outros módulos usam, e mudar uma assinatura dela é mudar um contrato: procure os usos (`@/modules/<módulo>`) antes.

Convenções das funções públicas:

- Primeiro parâmetro `contaId` em tudo o que lê ou grava dado da conta.
- Entrada `unknown` ou objeto simples vindo do formulário; o serviço valida com zod.
- Relógio injetável (`agora = new Date()`) em tudo o que depende da data, para os testes fixarem o dia.
- Dependências externas recebidas como parâmetro (`{ mailer, logger, appUrl }`), nunca importadas do `runtime` dentro do domínio.

## Cabeçalhos de segurança

Definidos em `next.config.ts` para todas as respostas: `Content-Security-Policy` (sem `unsafe-eval` em produção, `frame-ancestors 'none'`, `form-action 'self'`), `Strict-Transport-Security` (2 anos), `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin` e `Permissions-Policy` sem câmera, microfone, localização nem pagamento.
