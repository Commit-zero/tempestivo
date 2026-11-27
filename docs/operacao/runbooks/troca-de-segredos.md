# Runbook: troca de segredos

- **Severidade típica:** alta; a troca do AUTH_SECRET tranca quem usa o segundo fator
- **Dono:** responsável pelo serviço

| Segredo | Como trocar | Efeito |
|---|---|---|
| `AUTH_SECRET` | **Leia o aviso abaixo antes.** Novo valor na hospedagem e novo deploy | Encerra todas as sessões **e tranca quem usa a verificação em duas etapas** |
| `JOBS_SECRET` | Mesmo valor novo na hospedagem e nos segredos do GitHub, juntos | Execuções no meio da troca recebem 401 e repetem na próxima |
| Senha do banco | No Supabase (Database > Settings), depois `DATABASE_URL` na hospedagem e `DATABASE_URL_MIGRACAO` no GitHub | Conexões antigas caem |
| Senha SMTP | No provedor de e-mail, depois `SMTP_PASS` | — |

**Aviso sobre o `AUTH_SECRET`:** o segredo do aplicativo autenticador e os códigos de recuperação são cifrados com ele. Depois da troca, o servidor não consegue mais lê-los, e quem usa a verificação não entra nem com código de recuperação. O Better Auth tem segredos com versão (`BETTER_AUTH_SECRETS`), que permitiriam trocar sem esse efeito; o app ainda não os adota nem os testou.

Se a troca for urgente (vazamento), troque o segredo e rode o bloco abaixo (em produção, só com a confirmação de quem responde pelo serviço). Ele apaga a senha de quem usava a verificação: sem isso, essas contas ficariam protegidas só pela senha, que pode ter vazado junto, e quem a tivesse ligaria o próprio segundo fator. Também apaga todas as sessões (voltar ao segredo antigo as faria valer de novo) e tudo o que estava pendente.

```sql
begin;
update "account" set password = null
  where "providerId" = 'credential' and "userId" in (select "userId" from "twoFactor");
update "user" set "twoFactorEnabled" = false where id in (select "userId" from "twoFactor");
delete from "twoFactor";
delete from "session";
delete from "verification";
commit;
```

Depois, avise essas pessoas para criar uma senha nova em **Esqueci a senha** e ligar a verificação de novo. A caixa de e-mail passa a ser a única prova de identidade até lá.

Gere valores novos com `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. Nunca reaproveite um segredo entre ambientes.
