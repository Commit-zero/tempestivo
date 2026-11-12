import type { Config } from "@/platform/config";
import { criarFakeMailer } from "./fake-mailer";
import type { Mailer } from "./mailer";
import { criarSmtpMailer } from "./smtp-mailer";

export type { Email, Mailer } from "./mailer";
export { criarFakeMailer, type FakeMailer } from "./fake-mailer";

type ConfigDoMailer = Pick<Config, "MAILER_DRIVER" | "SMTP_HOST" | "SMTP_PORT" | "SMTP_USER" | "SMTP_PASS" | "EMAIL_REMETENTE">;

export function criarMailer(config: ConfigDoMailer): Mailer {
  switch (config.MAILER_DRIVER) {
    case "fake":
      return criarFakeMailer();
    case "smtp":
      // A validação da configuração garante host e remetente com este driver.
      return criarSmtpMailer({
        host: config.SMTP_HOST!,
        porta: config.SMTP_PORT,
        usuario: config.SMTP_USER,
        senha: config.SMTP_PASS,
        remetente: config.EMAIL_REMETENTE!,
      });
  }
}
