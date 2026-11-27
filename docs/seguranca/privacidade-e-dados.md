# Dados pessoais e LGPD

Inventário técnico dos dados pessoais que o sistema trata, montado a partir de [`prisma/schema.prisma`](../../prisma/schema.prisma) e do código. Serve para avaliar o impacto de uma mudança e para atender titulares.

> **Orientação técnica, não parecer jurídico.** As bases legais, os contratos com fornecedores e os textos publicados ainda precisam de revisão de um profissional.

## Papéis

| Dados | Controlador | Operador |
| --- | --- | --- |
| Conta do advogado | Tempestivo | — |
| Clientes, processos e demais registros do escritório | o advogado | Tempestivo |
| Advogado substituto (nome e e-mail) | informado pelo advogado | Tempestivo |

Esta é a divisão descrita na Política de privacidade publicada (`/privacidade`).

**Canal do titular:** vemaxtechbr@gmail.com, publicado na Política e definido em `EMAIL_DE_PRIVACIDADE` (`src/lib/termos.ts`). A Resolução CD/ANPD nº 2/2022 dispensa o agente de pequeno porte de indicar encarregado, desde que ofereça um canal ao titular (art. 11), mas a dispensa não vale em todos os casos, como o tratamento de alto risco. O enquadramento do projeto precisa ser confirmado.

## Bases legais

Só a primeira está na Política publicada. As outras são **propostas, a validar** por um profissional.

| Tratamento | Base proposta (art. 7º) |
| --- | --- |
| Dados da conta, para prestar o serviço | execução de contrato (V) |
| IP, navegador e limites de tentativa | legítimo interesse, pela segurança (IX) |
| Registro do aceite dos documentos | exercício regular de direitos (VI) |
| Nome e e-mail do substituto, antes do aceite do convite | legítimo interesse (IX) |
| Dados de clientes e processos | definida pelo advogado, que é o controlador |

## Inventário

| Dado | Onde fica | Para quê | Proteção | Eliminação |
| --- | --- | --- | --- | --- |
| Nome e e-mail do advogado | `user`, `conta` | acesso e alertas | acesso só pela própria conta | exclusão da conta |
| Senha | `account` | autenticação | só o resumo Argon2id | exclusão da conta |
| IP e navegador da sessão | `session` | segurança | sessão em cookie `HttpOnly` | vence em 7 dias sem uso e é apagada pela rotina de limpeza; a exclusão da conta remove na hora |
| Chave do autenticador e códigos de recuperação | `twoFactor` | segundo fator | cifrados com o `AUTH_SECRET` | desativação do segundo fator ou exclusão da conta |
| Nome, CPF ou CNPJ, e-mail, telefone e observações de clientes | `cliente` | o serviço | isolamento por conta | exclusão do cliente ou da conta |
| Número do processo, assunto, vara e parte contrária | `processo` | o serviço | isolamento por conta | exclusão do processo ou da conta |
| Textos livres de prazos, audiências, honorários e tarefas; local e link de sala | tabelas de cada módulo | o serviço | isolamento por conta | exclusão do registro ou da conta |
| Nome e e-mail do substituto | `conta` | escalada de prazo | só recebe depois de aceitar | remoção ou troca na tela Conta, ou exclusão da conta |
| Registro de conferências, histórico e alertas | `prazo_conferencia`, `prazo_historico`, `alerta` | rastreabilidade do prazo | isolamento por conta; links só como resumo SHA-256 | exclusão do prazo ou da conta |
| Data e versão do aceite | `conta` | registro do aceite | — | exclusão da conta |

O texto colado no leitor de intimação é processado no servidor e **não é gravado**.

Não há campo destinado a dado pessoal sensível. Os campos de texto livre podem recebê-lo, a critério de quem digita.

## Retenção

| Dado | Quando é apagado |
| --- | --- |
| Sessões e códigos temporários vencidos | pelo job `POST /api/jobs/limpeza`, chamado junto com os outros jobs |
| Conta e registros do escritório | quando o titular exclui o registro ou a conta |
| Logs e cópias de segurança dos fornecedores | conforme cada fornecedor; **os prazos não foram levantados** |
| Cópias feitas à mão com `pg_dump` | **sem prazo definido**: guarde só o necessário e apague as antigas |

O agendador gratuito atrasa. Entre o vencimento e a limpeza podem passar várias horas.

> **Antes de cobrar pelo produto:** o Marco Civil da Internet (Lei 12.965/2014, art. 15) obriga a empresa que oferece aplicação com fins econômicos a guardar registros de acesso por seis meses. Hoje o projeto não é comercial, e a limpeza apaga as sessões vencidas. Reveja este ponto com um advogado antes de comercializar.

## Cookies

| Cookie | Para quê | Validade |
| --- | --- | --- |
| Sessão (`tempestivo.session_token`) | manter o acesso | 7 dias, renovada com o uso |
| Passo pendente do segundo fator | concluir o login | 10 minutos |
| `tempestivo.aviso` | mostrar o resultado de uma ação; leva só uma chave de lista fixa | 20 segundos |

Não há cookie de publicidade nem de análise de uso.

## Compartilhamento

| Destinatário | O que recebe | Quando |
| --- | --- | --- |
| Hospedagem do app (Vercel, no ambiente atual) | o tráfego do app e os logs | sempre |
| Banco de dados (Supabase, região São Paulo) | todos os dados gravados | sempre |
| Provedor de e-mail (SMTP configurado) | destinatário e conteúdo. O alerta ao titular traz o ato, o assunto do processo e a data | a cada e-mail |
| Advogado substituto | nome do titular e a data do prazo, sem processo nem cliente | escalada, depois do aceite |
| App de calendário escolhido pelo advogado | descrição do ato, número do processo, tribunal, datas e local da audiência | só se a agenda for ligada |
| GitHub Actions (agendador) | nenhum dado pessoal: chama os jobs e recebe contadores | a cada execução |

**Em aberto:** a localização dos servidores do provedor de e-mail e a região de tratamento da hospedagem, para avaliar transferência internacional (art. 33), e os contratos com cada fornecedor.

## O que não vai para os logs

O logger oculta campos pelo nome (senha, token, e-mail, CPF, nome, descrição, assunto, texto e afins) e omite objetos aninhados. Erros do banco registram só o tipo e o código.

## Direitos do titular

| Pedido | Como o sistema atende |
| --- | --- |
| Acesso e portabilidade | **Conta → Exportar os dados** (JSON, sem senha, resumos de token ou dados do segundo fator) |
| Correção | telas de cadastro |
| Eliminação | **Conta → excluir**, com a senha. É definitiva e em cascata |
| Pedido de um cliente do advogado | o advogado atende, com as mesmas ferramentas |

Os procedimentos de atendimento estão em [operação](../operacao/README.md#pedidos-de-titulares-lgpd).

## Pendências

| Item | Quem resolve |
| --- | --- |
| Revisar os Termos de uso, a Política e as bases legais propostas | advogado |
| Confirmar o enquadramento como agente de pequeno porte | advogado |
| Levantar os prazos de retenção de logs e cópias nos fornecedores e a região de tratamento de cada um | responsável pelo serviço |
| Conferir se os contratos dos fornecedores cobrem o tratamento como operador e a transferência internacional | responsável pelo serviço, com o advogado |
| Quem aceitou uma versão anterior da Política não é avisado da nova | produto |
| Trilha de auditoria de acesso e de downloads | produto |

Em caso de incidente, siga o [runbook de suspeita de vazamento](../operacao/runbooks/suspeita-de-vazamento.md).
