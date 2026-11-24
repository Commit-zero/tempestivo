import { describe, expect, it } from "vitest";
import { criarMailer } from "./index";

// Integração com um servidor SMTP de verdade: o Mailpit do docker-compose (e o
// `service` do CI). A API do Mailpit mostra o que chegou.
const SMTP_PORTA = Number(process.env.SMTP_TESTE_PORTA ?? 54325);
const MAILPIT = process.env.MAILPIT_URL ?? "http://localhost:54380";

type Mensagem = { ID: string; Subject: string; From: { Address: string }; To: { Address: string }[] };

async function buscarMensagem(assunto: string): Promise<Mensagem | undefined> {
  for (let tentativa = 0; tentativa < 20; tentativa += 1) {
    const resposta = await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`subject:"${assunto}"`)}`);
    const { messages } = (await resposta.json()) as { messages: Mensagem[] };
    if (messages.length > 0) return messages[0];
    await new Promise((pronto) => setTimeout(pronto, 150));
  }
  return undefined;
}

describe("mailer SMTP (integração com o Mailpit)", () => {
  it("entrega texto e HTML com o remetente configurado", async () => {
    const mailer = criarMailer({
      MAILER_DRIVER: "smtp", SMTP_HOST: "localhost", SMTP_PORT: SMTP_PORTA, EMAIL_REMETENTE: "Tempestivo <nao-responda@tempestivo.test>",
    });
    const assunto = `Teste de integração ${Date.now()}`;

    await mailer.enviar({ para: "destino@exemplo.test", assunto, texto: "Olá, texto.", html: "<p>Olá, <strong>HTML</strong>.</p>" });

    const mensagem = await buscarMensagem(assunto);
    expect(mensagem).toMatchObject({ Subject: assunto, From: { Address: "nao-responda@tempestivo.test" }, To: [{ Address: "destino@exemplo.test" }] });
    const corpo = (await (await fetch(`${MAILPIT}/api/v1/message/${mensagem!.ID}`)).json()) as { Text: string; HTML: string };
    expect(corpo.Text).toContain("Olá, texto.");
    expect(corpo.HTML).toContain("<strong>HTML</strong>");
  });

  it("propaga a falha quando o servidor não aceita a conexão", async () => {
    const mailer = criarMailer({ MAILER_DRIVER: "smtp", SMTP_HOST: "127.0.0.1", SMTP_PORT: 1, EMAIL_REMETENTE: "x@tempestivo.test" });

    await expect(mailer.enviar({ para: "a@exemplo.test", assunto: "Nada", texto: "Nada" })).rejects.toThrow();
  });
});
