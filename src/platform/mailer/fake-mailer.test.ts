import { describe, expect, it } from "vitest";
import { criarFakeMailer } from "./fake-mailer";
import { criarMailer } from "./index";

const email = { para: "advogada@exemplo.com.br", assunto: "Prazo amanhã", texto: "Confira o prazo." };

describe("fake mailer", () => {
  it("enviar guarda o e-mail em enviados", async () => {
    const mailer = criarFakeMailer();
    await mailer.enviar(email);
    expect(mailer.enviados).toEqual([email]);
  });

  it("e-mail sem destinatário lança erro e não guarda", async () => {
    const mailer = criarFakeMailer();
    await expect(mailer.enviar({ ...email, para: "  " })).rejects.toThrow();
    expect(mailer.enviados).toHaveLength(0);
  });

  it("e-mail sem assunto lança erro e não guarda", async () => {
    const mailer = criarFakeMailer();
    await expect(mailer.enviar({ ...email, assunto: "" })).rejects.toThrow();
    expect(mailer.enviados).toHaveLength(0);
  });
});

describe("criarMailer", () => {
  it("devolve o fake com MAILER_DRIVER=fake", () => {
    expect(criarMailer({ MAILER_DRIVER: "fake", SMTP_PORT: 587 })).toHaveProperty("enviados");
  });
});
