# Histórico de mudanças

Mudanças relevantes para quem usa ou mantém o Tempestivo, da mais recente para a mais antiga. O projeto ainda não marca versões no Git: cada entrada corresponde à data em que a mudança entrou na `main`.

## 26/11/2026

### Adicionado
- Verificação em duas etapas por aplicativo autenticador, com códigos de recuperação.
- Troca de senha com a sessão aberta, regras de senha na tela e avisos de segurança por e-mail.
- Planilhas `.xlsx` de cada lista e planilha completa na tela Conta.
- Aviso do resultado de cada ação e diálogo de confirmação antes de excluir.

### Alterado
- Nova identidade visual e nova página inicial.
- O link de confirmação de e-mail deixou de abrir sessão.
- O CI e as verificações de segurança passaram a rodar em pull requests, inclusive de fork.
- O build passou a gerar o cliente do Prisma.

### Corrigido
- Vulnerabilidades do `apt` (CVE-2026-109518) e do PAM (CVE-2025-6020) na imagem Docker.

### Banco de dados
- Migração `20261126030015_segundo_fator`, que só acrescenta.

## 24/11/2026

### Alterado
- `/api/health` deixou de informar a versão do app.
- Atualizações de dependências e correções da revisão anterior à primeira publicação.

## Até 17/11/2026

### Adicionado
- Versão inicial: contas, clientes, processos, calculadora de prazos para CPC e CLT, conferência, alertas por e-mail com escalada, leitor de intimação, honorários, audiências, tarefas, agenda assinável, meta interna, exportação e exclusão dos dados.
