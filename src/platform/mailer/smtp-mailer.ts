import nodemailer from "nodemailer";
import type { Mailer } from "./mailer";

export type OpcoesSmtp = {
  host: string;
  porta: number;
  usuario?: string;
  senha?: string;
  remetente: string;
  /** Limite para conectar e para o servidor responder. */
  tempoMaximoMs?: number;
};

// SMTP comum (Gmail, Brevo, Mailpit). A porta 465 usa TLS direto; as demais
// negociam STARTTLS quando o servidor oferece.
export function criarSmtpMailer({ host, porta, usuario, senha, remetente, tempoMaximoMs = 10_000 }: OpcoesSmtp): Mailer {
  const transporte = nodemailer.createTransport({
    host,
    port: porta,
    secure: porta === 465,
    auth: usuario ? { user: usuario, pass: senha ?? "" } : undefined,
    // Sem isto, um servidor mudo prenderia a requisição que está esperando o envio.
    connectionTimeout: tempoMaximoMs,
    greetingTimeout: tempoMaximoMs,
    socketTimeout: tempoMaximoMs,
  });
  return {
    async enviar({ para, assunto, texto, html }) {
      await transporte.sendMail({ from: remetente, to: para, subject: assunto, text: texto, html });
    },
  };
}
