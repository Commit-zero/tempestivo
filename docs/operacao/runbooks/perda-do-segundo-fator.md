# Runbook: perda do celular e dos códigos de recuperação

- **Severidade típica:** alta para quem pede; risco de entregar a conta a um impostor
- **Dono:** responsável pelo serviço

## Perda do celular e dos códigos

Quem liga a verificação em duas etapas e fica sem o aplicativo entra com um código de recuperação (tela do código, "Estou sem o celular"). Sem o aplicativo **e** sem os códigos, não há botão nem rota que contorne o segundo fator: o atendimento é manual.

1. **Quem atende:** só o responsável pelo serviço (Vitor).
2. **Identidade:** o pedido precisa vir do e-mail da conta. Confirme também por um contato que a pessoa já tinha com você, quando houver (telefone ou mensagem já conhecidos). Nunca por um contato que chegou junto com o pedido. O e-mail sozinho não prova identidade: quem o invadiu poderia fazer o mesmo pedido, e este é o ponto mais fraco do procedimento. Na dúvida, não atenda.
3. **No banco** (em produção, só com a confirmação de quem responde pelo serviço): antes, `select id from "user" where email = 'EMAIL_DO_TITULAR';` precisa devolver exatamente uma linha. Com um e-mail errado, o bloco abaixo termina sem erro e **não faz nada**. Troque `EMAIL_DO_TITULAR` pelo e-mail em minúsculas e rode o bloco inteiro; confira antes que o e-mail não tem aspas simples e, depois, que o último `update` alterou uma linha. O bloco desliga o segundo fator, encerra as sessões, cancela passos pendentes e links, e apaga a senha atual:

```sql
begin;
delete from "twoFactor" where "userId" = (select id from "user" where email = 'EMAIL_DO_TITULAR');
delete from "session" where "userId" = (select id from "user" where email = 'EMAIL_DO_TITULAR');
delete from "verification" where value = (select id from "user" where email = 'EMAIL_DO_TITULAR');
update "account" set password = null
  where "providerId" = 'credential' and "userId" = (select id from "user" where email = 'EMAIL_DO_TITULAR');
update "user" set "twoFactorEnabled" = false where email = 'EMAIL_DO_TITULAR';
commit;
```

4. Peça à pessoa para criar uma senha nova em **Esqueci a senha** e, depois de entrar, ligar de novo a verificação.
5. Registre quando atendeu e como confirmou a identidade, sem copiar dados de clientes.

O teste `src/platform/auth/perda-de-acesso.test.ts` roda esse SQL num banco de teste.
