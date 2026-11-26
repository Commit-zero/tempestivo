# Spec guarda-chuva: modernização do Tempestivo

Estado: **aprovada em 25/11/2026 (Vitor)**, com as recomendações C1 a C6, o mapa e a ordem das etapas. A Etapa 0 também só vai à `main` depois da final. Este documento traz o mapa de capacidades, as etapas e as decisões. Cada etapa aprovada ganha especificação e plano de tarefas próprios antes do código.

## 1. Objetivo

Levar o Tempestivo de MVP a um SaaS jurídico profissional e comercializável, sem perder o que já funciona e sem arriscar a versão no ar antes da final de 27/11/2026. O usuário continua sendo o advogado autônomo. Entra um segundo papel: o dono do SaaS.

## 2. Situação conferida em 25/11/2026

| Item | Situação | Como foi conferido |
|---|---|---|
| Produção | `/api/health` responde `ok`, com os cabeçalhos de segurança | requisição de leitura |
| CI na `main` | passa | `gh run list` |
| Segurança na `main` | **falha**: CVE-2026-109518 (alta, com correção) em `apt` e `libapt-pkg6.0` da imagem Docker. A Vercel não usa essa imagem | log da execução |
| Proteção da `main` | **não existe** (sem proteção de branch e sem ruleset). Todo merge publica em produção | API do GitHub |
| PR de fork | **não é verificado**: `ci.yml` e `seguranca.yml` rodam em `push` | workflows |
| Agendador | o último disparo respondeu 200. Os disparos automáticos saem com intervalos de **5 a 12 horas**, não de 2 em 2 como dizem os documentos | histórico do `jobs.yml` (só o último log foi aberto) |
| Documentos | `SECURITY.md` e `operacao.md` dizem que `/api/health` devolve a versão; o código não devolve mais | código e busca |
| `docs/deploy.md` | passo de desligar a Data API ainda sem commit | `git diff` |

Testes, lint, tipos, build e e2e **não foram rodados localmente** nesta análise.

## 3. Pedido x o que já existe

| Pedido | Já existe | Falta |
|---|---|---|
| 1. Identidade visual | Símbolo e marca em SVG, tema claro e escuro, contraste testado, 360/768/1280 px | Nova logo, paleta mais rica, componentes, menus, capa |
| 2. Página inicial | Capa com seis pilares e prévia fictícia | Carrossel, problemas, soluções, diferenciais |
| 3. Autenticação | Confirmação de e-mail (não bloqueia o login; sem ela não há alerta), recuperação de senha, mínimo de 10 caracteres, Argon2id, limite de tentativas | **MFA**, confirmação de senha, regras de senha na tela, troca de senha com sessão aberta |
| 4. Perfil profissional | Nome e nome da conta | OAB, UF, telefone, endereço, especialidades, escritório |
| 5. Clientes e processos | Cadastro, busca, arquivamento, validação de CPF/CNPJ e CNJ | Mais campos, contatos, histórico, filtros, consulta cadastral, documentos |
| 6. LGPD | Isolamento por conta, aceite com versão, exportação JSON, exclusão definitiva, logs sem dados pessoais | Retenção, anonimização, pedidos de titular, trilha de auditoria, revisão jurídica |
| 7. Excel | Não | Tudo |
| 8. Confirmações e feedback | Mensagens no formulário, `window.confirm`, estados de carregamento e erro | Diálogo próprio, avisos visuais padronizados |
| 9. Painel do proprietário | Não | Tudo |
| 10. Integrações | SMTP, feed iCalendar, `.ics`, feriados calculados localmente | CEP, CNPJ |
| 11. Qualidade | Monólito modular, fronteiras impostas pelo lint | Refatoração dentro de cada etapa |
| 12. GitHub e documentação | README completo e oito documentos | Atualizar a cada etapa e corrigir as divergências |
| 13. Testes e CI/CD | Vitest com cobertura mínima, Playwright, TruffleHog, Trivy, Semgrep, Docker | Verificar PR de fork e **exigir os checks na `main`** |

## 4. Conflitos que precisam de decisão

| # | Conflito | Recomendação | Alternativa |
|---|---|---|---|
| C1 | Funcionalidades congeladas em 17/11; MVP em 25/11 e final em 27/11; merge na `main` publica | **Nada de funcionalidade na `main` até o fim da final.** Desenvolvimento numa branch à parte | Publicar antes só a Etapa 0, que não muda o app (mas gera novo deploy) |
| C2 | "Gestão de escritórios" exige várias pessoas por conta (fora do escopo). Hoje `Conta.usuarioId` é único, e o isolamento depende disso | **Agora, só os dados do escritório no perfil.** Várias pessoas ganha especificação própria depois (convites, papéis, permissão em cada ação, saída de membro, LGPD) | Incluir neste ciclo: é a maior e mais arriscada das etapas |
| C3 | Assinaturas e faturamento sem gateway pago (custo zero) | **Registro manual:** planos, situação e vencimento da assinatura e pagamentos lançados pelo dono, identificados como manuais. Sem cobrança automática e sem bloquear conta sozinho | Deixar fora até existir gateway aprovado |
| C4 | Consulta oficial de CPF: a API do Serpro é contratada e cobrada por consumo | **CPF só com validação local dos dígitos (já existe) e CNPJ por API pública gratuita.** A tela não chama isso de consulta oficial de CPF. Não automatizar o site da Receita nem contornar CAPTCHA | Contratar o Serpro depois, atrás de uma porta, com base legal e finalidade registradas |
| C5 | Anexos de documentos estão no roadmap | **Controle de documentos sem arquivo:** tipo, descrição, situação, data e onde está guardado | Upload para o Supabase Storage: exige credencial nova em produção, controle de acesso, antivírus, retenção e cota gratuita limitada |
| C6 | "Comercializável": o plano Hobby da Vercel é só para uso não comercial ([regras de uso](https://vercel.com/docs/limits/fair-use-guidelines)) | **Manter o Hobby no desafio, sem cobrar de ninguém.** Antes de vender: rever hospedagem, termos e política com um advogado | Mudar agora para outra hospedagem pela imagem Docker, após conferir os termos dela |

Aprovada a decisão, a seção "Fora do escopo" do `CLAUDE.md` é atualizada no mesmo PR da etapa.

## 5. Mapa de capacidades

| Id | Responsabilidade | Pedidos | Depende de | Migração |
|---|---|---|---|---|
| `protecao-da-main` | Checks obrigatórios, PR de fork, CVE do `apt`, documentos divergentes | 13, 12 | — | não |
| `autenticacao-reforcada` | MFA, confirmação e regras de senha, troca de senha | 3 | `protecao-da-main` | sim |
| `identidade-visual` | Logo, tokens, componentes, menus, feedback, capa e carrossel | 1, 2, 8 | `protecao-da-main` | não |
| `exportacoes` | Planilhas por lista e relatório | 7 | `protecao-da-main` | não |
| `perfil-profissional` | OAB, endereço, especialidades, escritório, CEP | 4, 10 | `identidade-visual` | sim |
| `cadastros` | Clientes, contatos, histórico, filtros, controle de documentos, CNPJ | 5, 10 | `perfil-profissional`, `exportacoes` | sim |
| `privacidade-lgpd` | Retenção, anonimização, pedidos, auditoria, textos | 6 | `cadastros` | sim |
| `painel-do-proprietario` | SUPER_ADMIN, indicadores, assinaturas manuais, suporte | 9 | `autenticacao-reforcada`, `perfil-profissional`, `privacidade-lgpd` | sim |
| `escritorios` | Várias pessoas por conta (**adiado**, ver C2) | 9 e objetivo | todas | sim |

Os pedidos 11, 12 e 13 valem em todas as etapas.

## 6. Etapas

Ordem: a do mapa, de cima para baixo. Cada etapa é um PR (ou poucos), publicável sozinho.

### Etapa 0: `protecao-da-main`
- Corrigir a CVE do `apt` na imagem (atualizar o digest da imagem base ou o pacote nos estágios) e confirmar pelo Trivy.
- Workflows em `pull_request` (nunca `pull_request_target`) e em `push` só na `main`.
- Ruleset na `main`: PR obrigatório e checks obrigatórios (`qualidade`, `e2e`, `imagem`, `segredos`, `dependências`, `código`). A varredura da imagem passa a rodar também em PR, ou fica fora dos obrigatórios. **É configuração do GitHub: só com a sua confirmação.** Exigir revisão aprovada também, se os dois puderem revisar a tempo.
- Commit do passo da Data API em `docs/deploy.md`; corrigir a versão no `/api/health` e a frequência real do agendador nos documentos.
- Pronto: Segurança verde na `main`; um PR com teste quebrado não pode ser mesclado.

### Etapa 1: `autenticacao-reforcada`
- Confirmar senha no cadastro e na redefinição; regras de senha validadas no servidor e mostradas na tela.
- MFA por aplicativo autenticador (TOTP) com códigos de recuperação, pelo plugin `twoFactor` do Better Auth já instalado ([documentação](https://www.better-auth.com/docs/plugins/2fa); conferir a da versão 1.7). Sem SMS, que é pago. `/api/auth/*` continua fechada.
- Migração aditiva: tabela `twoFactor` e `user.twoFactorEnabled`.
- Pronto: testes de login com e sem MFA, código de recuperação de uso único, limite de tentativas, desativação só com senha. Definir o procedimento para quem perder o aparelho e os códigos.

### Etapa 2: `identidade-visual`
- Logo, ícones, imagem de compartilhamento, paleta nos tokens de `globals.css` (contraste testado nos dois temas).
- Capa com carrossel sem dependência nova, operável por teclado e sem rotação automática (mudado em 26/11/2026; antes, rotação com pausa); problemas, soluções e diferenciais, só com o que o sistema faz.
- Diálogo de confirmação no lugar de `window.confirm` e avisos de sucesso, erro, alerta e carregamento.
- Pronto: e2e e acessibilidade nas quatro larguras, sem rolagem horizontal.

### Etapa 3: `exportacoes`
- `.xlsx` de clientes, processos, prazos, honorários e parcelas, audiências e tarefas, com os filtros da tela. Prazos saem com "cálculo auxiliar, confira".
- Biblioteca candidata: `write-excel-file` 4.1.1 (MIT, uma dependência: `fflate`). O `exceljs` não é publicado desde 2024.
- Pronto: teste de isolamento entre contas, de texto iniciado por `=` que não vira fórmula, e de datas em dd/mm/aaaa.

### Etapa 4: `perfil-profissional`
- Campos opcionais do perfil e do escritório; OAB validada só no formato (não há conferência oficial).
- CEP atrás de uma porta em `src/platform/`, chamada pelo servidor (a CSP continua `'self'`), enviando só o CEP. Falha da API não impede salvar. Conferir os termos do provedor antes.

### Etapa 5: `cadastros`
- Campos com finalidade declarada (minimização), contatos, histórico de alterações, filtros e paginação.
- CNPJ por API pública, atrás de porta, só quando o usuário pede. Documentos conforme C4 e C5.

### Etapa 6: `privacidade-lgpd`
- Política de retenção, anonimização de cliente (sem quebrar processos e honorários), exclusão segura, registro e acompanhamento de pedidos de titular, trilha de auditoria sem conteúdo sensível.
- Textos novos mudam a versão dos termos e pedem novo aceite. Prazos de guarda e bases legais **precisam de revisão por advogado**. Documentar o que acontece com dados em backup.

### Etapa 7: `painel-do-proprietario`
- Área `/proprietario` separada. SUPER_ADMIN só com MFA ativo, nunca atribuível por tela ou formulário; atribuir em produção é ação sua.
- O dono vê contas, atividade, contagens, uso do banco, assinaturas manuais (C3) e chamados de suporte. **Nunca** vê clientes, processos, prazos ou honorários de ninguém.
- É a única leitura que cruza contas (exceção à regra 3): fica num módulo próprio, só com agregados e metadados, com auditoria e teste de que advogado comum recebe 404.

### Depois: `escritorios`
Especificação própria, após as etapas acima (C2).

## 7. Cronograma e proteção da produção

| Quando | O que |
|---|---|
| Até o fim da final (27/11) | `main` parada. No máximo a Etapa 0, se você aprovar (C1). Etapas 1 em diante só em branch |
| Depois da final | Uma etapa por vez, na ordem do mapa |

Não há estimativa de que o pedido inteiro caiba antes da final, e ele não deve ser tentado.

Regras de entrega:

1. Uma branch por etapa, criada de `main`, num worktree próprio, sem mexer no checkout em uso.
2. **Antes do primeiro push**, conferir na Vercel que o ambiente *Preview* não tem variáveis de produção (cada branch gera um Preview). Quem confere é você.
3. Migrações só aditivas. Ordem: o PR da migração, o workflow **Migrar o banco de produção** com a sua aprovação, e só então o código que depende dela.
4. Antes do merge: lint, tipos, testes, build, e2e e o agente de revisão aplicável.
5. Depois do deploy: `/api/health` e um fluxo curto. Se falhar, *Instant Rollback*.
6. A Data API do Supabase continua desligada. Se um dia for ligada, antes é preciso RLS em todas as tabelas.

## 8. Padrões desta spec

- **Stack:** a do `CLAUDE.md`, sem troca de tecnologia. "Modernizar CSS e JavaScript" é refatorar sobre Tailwind 4 e React 19, dentro de cada etapa, sem reescrita geral.
- **Estrutura:** módulos em `src/modules/`, externos em `src/platform/`, specs em `docs/especificacoes/`.
- **Estilo:** o do código atual. A ação faz a ponte e o serviço valida: `const r = await servico(contaId, dados); if (!r.ok) return { erro: r.erro };`
- **Comandos:** `corepack pnpm lint`, `corepack pnpm typecheck`, `corepack pnpm test:cobertura`, `corepack pnpm build`, `corepack pnpm e2e` (nesta máquina, com `PLAYWRIGHT_CHANNEL=msedge`).
- **Testes:** teste primeiro no domínio; integração com Postgres real e isolamento entre contas; e2e com acessibilidade; metas de cobertura mantidas.
- **Fora desta spec:** regras de prazo (sem validação de advogado, nada muda; feriado de API externa não entra no cálculo), Pix, tribunais, WhatsApp oficial, app nativo, push e modelo de linguagem.

## 9. Limites

- **Sempre:** `contaId` obrigatório; custo zero; dados fictícios; português do Brasil; conferir licença e custo de dependência.
- **Perguntar antes:** merge na `main`; configuração do GitHub, da Vercel ou do Supabase; migração em produção; segredo novo; API externa nova.
- **Nunca:** segredo no repositório; ligar a Data API sem RLS; tela com recurso que não funciona; contornar CAPTCHA; mostrar ao dono do SaaS os dados dos clientes dos advogados.

## 10. Critérios de sucesso

Cada etapa: critérios dela cumpridos, definição de pronto, CI e Segurança verdes, documentação atualizada e um resumo do que foi feito, do que ficou de fora e por quê. A versão no ar passa pela final sem mudança não aprovada.

## 11. Premissas (corrija se alguma estiver errada)

1. O produto continua em fase de testes, só com dados fictícios, até a revisão jurídica.
2. Não há usuário real cujo dado precise de migração especial. Não consultei o banco de produção.
3. "Escritório" no pedido 4 são dados cadastrais; no pedido 9, o painel lista contas.
4. MFA é opcional para advogados e obrigatório para o SUPER_ADMIN.

## 12. Decisões aprovadas em 25/11/2026

1. C1 a C6: vale a coluna "Recomendação" da seção 4.
2. Mapa de capacidades e ordem das etapas como estão.
3. Nenhum merge na `main` antes do fim da final, nem o da Etapa 0. O ruleset continua pedindo confirmação na hora de ligar.
