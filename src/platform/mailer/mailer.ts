export type Email = { para: string; assunto: string; texto: string; html?: string };

export interface Mailer {
  enviar(email: Email): Promise<void>;
}
