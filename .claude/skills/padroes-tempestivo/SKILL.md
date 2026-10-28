---
name: padroes-tempestivo
description: Use ao criar qualquer módulo, rota, integração externa, job ou tela do Tempestivo. Define a arquitetura portável de custo zero (portas e adaptadores, contaId, jobs idempotentes, mobile-first).
---

# Padrões do Tempestivo

Objetivo: rodar de graça agora e poder migrar de hospedagem só trocando variáveis de ambiente e, no máximo, um adaptador.

## 1. Monólito modular

```
src/modules/<modulo>/   domínio + serviço + repositório; só index.ts é público
src/platform/<porta>/   interface + adaptadores (storage, mailer, notifier, ai, scheduler, auth, config, logger, database)
src/app/                telas e rotas; chamam serviços, nunca o Prisma direto
```

- `platform/database/` guarda só o cliente Prisma único, sem interface própria. Só o `repositorio.ts` de cada módulo importa esse cliente.
- Um módulo importa outro **somente** pelo `index.ts`.
- Regra de negócio fica em `modules/`, nunca em componente React nem em rota.

## 2. Portas e adaptadores

Todo serviço externo é usado por uma interface nossa:

| Porta | Hoje (grátis) | Depois |
|---|---|---|
| `Storage` | Supabase Storage via S3 | R2, S3 |
| `Mailer` | SMTP (Gmail, Brevo) | Resend, SES |
| `Notifier` | e-mail + push PWA + link `wa.me` | + API do WhatsApp |
| `Extrator` (IA) | Gemini gratuito | modelo pago sem treino com os dados |
| `Scheduler` | GitHub Actions chamando `/api/jobs/*` | cron real ou fila |

Para criar uma porta nova: defina a interface, escreva o adaptador atual, escolha o adaptador por variável de ambiente, e escreva um adaptador falso para testes.

## 3. Conta e isolamento de dados

- Toda tabela de negócio tem `contaId`. Todo método de repositório recebe `contaId` como **primeiro parâmetro obrigatório**.
- Rotas pegam `contaId` da sessão, nunca do corpo ou da URL.
- Arquivos privados, entregues por link temporário.
- Teste obrigatório por módulo: "a conta B não enxerga dados da conta A".

## 4. Jobs

- Rota `/api/jobs/<nome>`, protegida por segredo no cabeçalho, que **só chama um serviço**.
- Idempotentes: cada alerta tem chave única (`prazoId + camada + data`). Rodar duas vezes não duplica envio.
- Registram início, fim e erros no log estruturado.
- O mesmo job também mantém o banco ativo (o Supabase grátis pausa por inatividade).

## 5. Configuração

- Só por variáveis de ambiente, validadas com zod na inicialização. Falhou a validação, o app não sobe.
- `.env.example` sempre atualizado; nunca commitar `.env`.
- Proibido: KV, Blob, Edge Config e outros recursos exclusivos do Vercel.

## 6. IA

- Sempre atrás da porta `Extrator`, com saída estruturada validada por zod.
- Resultado é **rascunho** com campo `confianca`. Só vira dado oficial após confirmação do advogado.
- Camada gratuita: apenas dados fictícios ou anonimizados.
- Se a IA falhar ou estourar a cota, a tela segue com o formulário manual.

## 7. Telas

- Mobile-first: testar em 360, 768 e 1280 px. Alvos de toque de pelo menos 44 px.
- Português do Brasil, datas dd/mm/aaaa, fuso `America/Sao_Paulo`.
- Dashboard e lista de prazos são as telas mais importantes no celular.
- Estados vazios, de carregamento e de erro em toda lista.
- Acessibilidade conforme `.claude/references/accessibility-checklist.md`.

## 8. Qualidade

- Fatias pequenas, teste primeiro no domínio (Vitest), Playwright nas telas críticas.
- Definição de pronto em `.claude/references/definition-of-done.md`.
- Mudou segurança, dados ou prazos: acionar `revisor-seguranca-lgpd` ou `revisor-de-prazos`.
