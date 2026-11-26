# 0012. Oferecer segundo fator por aplicativo autenticador

- **Status:** aceito
- **Registrado em:** 2026-11-26

## Contexto

Uma senha vazada abria a conta. SMS custa, e código por e-mail depende da mesma caixa que recupera a senha.

## Decisão

TOTP pelo plugin `twoFactor` do Better Auth, opcional, com códigos de recuperação. Ativação só com e-mail confirmado. O app acrescenta o que a biblioteca não faz: recusa código repetido (chave primária em `verification`), limita a ativação e a gestão, encerra as outras sessões ao ligar e avisa por e-mail. O link de confirmação de e-mail não abre sessão. Não há "confiar neste aparelho". O QR code é desenhado no servidor (`uqr`, MIT, sem dependências).

## Consequências

O `AUTH_SECRET` passou a proteger também o segundo fator, e trocá-lo tem custo (ver o [runbook de troca de segredos](../operacao/runbooks/troca-de-segredos.md)). Perder o celular e os códigos exige atendimento manual. Só o login por senha cobra o segundo fator: qualquer forma de entrada nova precisa rever isso.
