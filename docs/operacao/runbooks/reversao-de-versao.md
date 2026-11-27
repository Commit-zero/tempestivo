# Runbook: voltar à versão anterior

- **Severidade típica:** alta
- **Dono:** responsável pelo serviço

**Atenção com a verificação em duas etapas:** uma versão anterior a ela não cobra o segundo fator (e ainda abria sessão pelo link de confirmação). Depois que alguém a ligar, voltar a versão faz essa conta entrar só com a senha, sem nenhum erro visível. Prefira corrigir para a frente. Se a volta for inevitável, encerre as sessões, avise quem usa a verificação e volte para a versão nova o quanto antes.

Código: na Vercel, *Instant Rollback* para o deploy anterior. Banco: migrações não têm volta automática. Por isso, mudanças que removem coluna são feitas em duas entregas (ver [como mudar o esquema](../../arquitetura/modelo-de-dados.md#como-mudar-o-esquema)), e qualquer deploy pode voltar uma versão sem quebrar com o esquema atual.
