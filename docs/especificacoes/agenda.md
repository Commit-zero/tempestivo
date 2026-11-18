# Spec: meta interna e agenda assinável (módulo `agenda`)

> Estado: **implementada** (PR #10). Esta especificação registra o objetivo, as decisões e os critérios de aceite da funcionalidade. Quando código e especificação divergirem, vale o código, e a divergência deve ser anotada aqui.

## Objetivo

O advogado autônomo não perde prazo por não saber a data; perde porque deixa para o último dia e algo dá errado (sistema do tribunal fora do ar, cliente que não entrega documento, outra urgência). E a agenda que ele olha de manhã é a do celular, não a do Tempestivo.

Duas capacidades, entregues juntas porque uma alimenta a outra:

1. **Meta interna.** Cada prazo em aberto ganha uma data-alvo alguns dias úteis antes do vencimento, quando o trabalho deveria estar pronto. A margem é da conta: 2 dias úteis por padrão, de 0 a 10.
2. **Agenda assinável.** Um link de calendário (iCalendar, RFC 5545) que o advogado assina uma vez no Google Agenda, no Apple Calendário ou no Outlook. O calendário passa a mostrar os vencimentos, as metas internas e as audiências, com lembretes, e se atualiza sozinho.

Histórias de usuário:

- Como advogado, quero ver a data em que devo terminar a peça, não só a data em que ela vence, para ter folga.
- Como advogado, quero que os vencimentos apareçam no calendário do meu celular sem digitar nada duas vezes.
- Como advogado, quero poder cortar o acesso do calendário a qualquer momento, se eu perder o celular ou o link vazar.

### Premissas

1. Custo zero: nada de API do Google ou da Microsoft, nada de push. iCalendar por URL é suportado por todos os calendários sem integração.
2. A margem é contada em **dias úteis**, com o mesmo calendário do tribunal que a calculadora usa: fins de semana, feriados e dias sem expediente cadastrados pela conta. Pontos facultativos que dependem de portaria (Carnaval, 08/12 e outros) também são pulados: na calculadora, contá-los como úteis é o lado seguro (a data sai mais cedo); na contagem para trás, o lado seguro é o oposto.
3. A meta **não** pula o recesso de 20/12 a 20/01: ela é interna, e o escritório pode trabalhar no recesso. Pular o recesso jogaria a meta de um prazo de fevereiro para antes do Natal.
4. O calendário do celular fica fora do sistema (servidores do Google, da Apple ou da Microsoft). Por isso o feed leva só o mínimo necessário (minimização, LGPD art. 6º, III).
5. O link do feed é a credencial: não há sessão na requisição do calendário.

## Requisitos funcionais

| Id | Requisito |
|---|---|
| AG-01 | A conta guarda a margem de segurança em dias úteis (inteiro de 0 a 10, padrão 2), editável em Conta. |
| AG-02 | Para cada prazo em aberto, `metaInterna` é a data N dias úteis antes de `dataFinal`, contada para trás no calendário do tribunal do processo, sem pular o recesso. |
| AG-03 | `metaChegou` é verdadeiro quando hoje (America/Sao_Paulo) é igual ou posterior à meta, inclusive no dia do vencimento. Prazo cumprido ou vencido não tem meta. |
| AG-04 | A lista de prazos, o detalhe do prazo e o painel mostram a meta, sempre marcada como cálculo auxiliar; o painel tem a seção "Meta interna chegou". |
| AG-05 | O advogado cria o link da agenda em Conta; o link aparece **uma única vez**, com botão de copiar, link `webcal://` e instruções para o Google Agenda. |
| AG-06 | Trocar o link invalida o anterior na hora; desligar a agenda invalida o link atual. |
| AG-07 | `GET /agenda/{token}/calendario.ics` devolve o feed da conta dona do token, ou 404 para token inválido, trocado ou desligado, sem distinguir os casos. |
| AG-08 | O feed traz, por prazo em aberto (inclusive vencido nos últimos 90 dias), um evento de dia inteiro "Vence: {descrição}" com lembrete na véspera às 9h e, se houver meta, um evento "Meta interna: {descrição}" com lembrete no dia às 9h. |
| AG-09 | O feed traz as próximas audiências com início, duração, local e lembrete 1 hora antes. Audiência só virtual aparece como "Audiência virtual (link no Tempestivo)": o link da sala, que costuma levar a senha, não vai para o calendário. |
| AG-10 | O feed nunca traz nome de cliente, nome de parte contrária, assunto do processo nem link de sala virtual. Traz a descrição do prazo, o número do processo, o tribunal, o local, as datas e o link para o app. A tela e a Política de privacidade dizem isso, e pedem para não escrever nomes na descrição. |
| AG-11 | Cada evento tem `UID` estável (`prazo-{id}-vencimento@tempestivo`), para o calendário atualizar o evento em vez de duplicar. |
| AG-12 | Desligar a agenda avisa que os eventos já baixados ficam no calendário até o advogado remover a assinatura. |

## Requisitos não funcionais

- **Segurança do link:** 256 bits aleatórios (`randomBytes(32)`, base64url). O banco guarda só o resumo SHA-256 (`Conta.agendaTokenHash`, único). O formato do token é validado antes de qualquer consulta.
- **Cabeçalhos do feed:** `Content-Type: text/calendar; charset=utf-8`, `Cache-Control: private, no-store` (revogação imediata), `X-Robots-Tag: noindex, nofollow`, `Referrer-Policy: no-referrer`.
- **Abuso:** 60 requisições por IP a cada 15 minutos, por instância (429 com `Retry-After`). Um app de calendário baixa o feed poucas vezes por hora.
- **Conformidade com a RFC 5545:** linhas terminadas em CRLF e dobradas em 75 octetos UTF-8; texto escapado (`\`, `;`, `,`, quebras de linha) e sem caracteres de controle; eventos de dia inteiro com `DTSTART;VALUE=DATE` e `TRANSP:TRANSPARENT`; `REFRESH-INTERVAL` e `X-PUBLISHED-TTL` de 1 hora.
- **Cálculo auxiliar:** a descrição de cada evento calculado diz "Cálculo auxiliar: confira a data nos autos"; a data manual diz "Data final digitada pelo advogado".
- **Isolamento:** o token resolve uma única `contaId`, e todas as consultas seguintes filtram por ela.
- **Mobile-first:** o painel da agenda funciona em 360 px, com alvos de toque de 44 px.

## Arquitetura

| Peça | Onde | Responsabilidade |
|---|---|---|
| `metaInterna()` | `src/modules/prazos/dominio/meta-interna.ts` | Domínio puro: conta N dias úteis para trás. |
| `situacaoDoPrazo()` | `src/modules/prazos/dominio/situacao.ts` | Acrescenta `metaInterna` e `metaChegou` à situação do prazo. |
| `preparadorDaMeta()` | `src/modules/prazos/servico.ts` | Lê a margem da conta e os dias sem expediente, com cache por tribunal dentro da requisição. |
| Margem e token | `src/modules/conta/servico.ts` | `definirMargemDeSeguranca`, `ativarAgenda`, `desativarAgenda`, `contaDaAgenda`. |
| `gerarCalendario()` | `src/lib/icalendar.ts` | Utilitário puro que gera o texto iCalendar; também usado pelo `.ics` de cada audiência. |
| `gerarFeedDaAgenda()` | `src/modules/agenda/servico.ts` | Compõe o feed a partir de `conta`, `prazos`, `audiencias` e `processos`. |
| Rota | `src/app/agenda/[token]/calendario.ics/route.ts` | Borda HTTP, sem sessão. |
| Tela | `src/app/(app)/conta/agenda.tsx` e `acoes.ts` | Formulário da margem e painel do link. |

Dependências: `agenda` → `conta`, `prazos`, `audiencias`, `processos`; `prazos` → `conta`. Sem ciclos (a exportação de `conta` só lê os outros módulos nos testes).

## Modelo de dados

Migração `20261117210000_agenda_e_meta_interna`, na tabela `conta`:

| Coluna | Tipo | Observação |
|---|---|---|
| `margemDeSegurancaDiasUteis` | `integer`, padrão 2 | validada de 0 a 10 no serviço |
| `agendaTokenHash` | `text`, único, opcional | resumo SHA-256 do link |
| `agendaAtivadaEm` | `timestamp`, opcional | mostrado na tela ("Agenda ligada desde…") |

A exportação LGPD inclui a margem e a data de ativação, nunca o resumo do token. A exclusão da conta apaga tudo em cascata.

## Testing strategy

- **Domínio** (`meta-interna.test.ts`, `situacao.test.ts`): margem padrão, fim de semana, feriado, dia sem expediente cadastrado, ponto facultativo (Carnaval, 08/12), recesso não pulado, sem calendário do tribunal; propriedade sobre dois anos (a meta nunca cai em dia sem expediente nem em ponto facultativo); destaque no dia do vencimento; vencido e cumprido sem meta.
- **Utilitário** (`icalendar.test.ts`): CRLF, dobra em 75 octetos com acentos, escape, evento de dia inteiro, lembretes.
- **Integração** (`agenda.test.ts`, Postgres real): feed com prazos e audiências, link trocado devolve `null`, link desligado devolve `null`, outra conta não aparece, **nome do cliente, parte, assunto e link de sala virtual não aparecem**, vencidos há mais de 90 dias saem.
- **Tela** (`e2e/agenda.spec.ts`, três larguras): ajusta a margem, cria o link, baixa o feed, troca (o antigo dá 404) e desliga.

## Boundaries

- **Sempre:** minimizar o conteúdo do feed; validar o token antes de consultar; mostrar o link uma vez só.
- **Perguntar antes:** incluir qualquer dado novo no feed; mudar o lembrete padrão; contar a meta pulando o recesso.
- **Nunca:** guardar o token em texto puro; pôr nome de cliente ou de parte no feed; exigir integração paga com calendário.

## Success criteria

- [x] Margem padrão 2 e editável de 0 a 10, com mensagem de erro em português fora da faixa.
- [x] Meta visível na lista, no detalhe e no painel, com "já chegou" quando for o caso.
- [x] Feed válido assinado no Google Agenda e no Apple Calendário (conferido pelo formato da RFC 5545 nos testes; a assinatura real depende de URL pública com HTTPS).
- [x] Link trocado ou desligado devolve 404 imediatamente.
- [x] Teste automatizado prova que o feed não contém nome de cliente, de parte nem assunto.

## Revisões

- **revisor-de-prazos (18/11/2026):** ponto facultativo contado como dia de trabalho encurtava a margem; vencido mostrava meta; destaque sumia no dia do vencimento; faltava "cálculo auxiliar" no detalhe, no painel e no feed; teto da margem duplicado. Todos corrigidos com teste.
- **revisor-seguranca-lgpd (18/11/2026):** link de sala virtual no feed; caracteres de controle; sem limite de requisições; cache de 5 minutos atrasando a revogação; política de privacidade sem a agenda; exportação sem os campos novos. Todos corrigidos. O token no caminho da URL fica nos logs de acesso da hospedagem (inevitável com `webcal`): ver `SECURITY.md`.

## Open questions

1. **Validação jurídica:** a meta herda o calendário da calculadora, cujas regras ainda estão `pendente`. A tela marca o cálculo como auxiliar. A decisão de não pular o recesso e de pular os pontos facultativos deve ser confirmada pelo advogado validador.
2. **Margem 0:** desliga a meta (não há meta no próprio vencimento), e o feed não gera o evento.
3. **Último acesso ao feed:** gravar quando o feed foi baixado pela última vez ajudaria o titular a perceber um link vazado. Fica como evolução.
