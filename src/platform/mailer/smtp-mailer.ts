import nodemailer from "nodemailer";
import type { Mailer } from "./mailer";

export type OpcoesSmtp = {
  host: string;
  porta: number;
  usuario?: string;
  senha?: string;
  remetente: string;
};

// SMTP comum (Gmail, Brevo, Mailpit). A porta 465 usa TLS direto; as demais
// negociam STARTTLS quando o servidor oferece.
export function criarSmtpMailer({ host, porta, usuario, senha, remetente }: OpcoesSmtp): Mailer {
  const transporte = nodemailer.createTransport({
    host,
    port: porta,
    secure: porta === 465,
    auth: usuario ? { user: usuario, pass: senha ?? "" } : undefined,
  });
  return {
    async enviar({ para, assunto, texto, html }) {
      await transporte.sendMail({ from: remetente, to: para, subject: assunto, text: texto, html });
    },
  };
}
