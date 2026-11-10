import type { Email, Mailer } from "./mailer";

export type FakeMailer = Mailer & { readonly enviados: Email[] };

export function criarFakeMailer(): FakeMailer {
  const enviados: Email[] = [];
  return {
    enviados,
    async enviar(email) {
      if (!email.para.trim()) throw new Error("E-mail sem destinatário.");
      if (!email.assunto.trim()) throw new Error("E-mail sem assunto.");
      enviados.push(email);
    },
  };
}
