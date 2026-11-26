import { describe, expect, it } from "vitest";
import { criarFakeLogger } from "@/platform/logger";
import { criarFakeMailer, type Mailer } from "@/platform/mailer";
import { enviarAvisoDeSeguranca, type AvisoDeSeguranca } from "./avisos";

const destinatario = { nome: "Advogada Fictícia", email: "titular@exemplo.test" };
const TODOS: AvisoDeSeguranca[] = [
  "senha-alterada", "senha-redefinida", "segundo-fator-ligado", "segundo-fator-desligado",
  "codigos-gerados", "codigo-usado",
];

describe("avisos de segurança", () => {
  it.each(TODOS)("%s: avisa o titular, diz o que fazer e não leva token nem código", async (aviso) => {
    const mailer = criarFakeMailer();

    await enviarAvisoDeSeguranca(aviso, destinatario, { mailer, logger: criarFakeLogger(), appUrl: "https://app.exemplo.test/" });

    expect(mailer.enviados).toHaveLength(1);
    const { para, assunto, texto } = mailer.enviados[0]!;
    expect(para).toBe(destinatario.email);
    expect(assunto).toContain("Tempestivo");
    expect(texto).toContain("Se não foi você");
    // O único endereço é o da tela de recuperação, sem token.
    expect(texto.match(/https?:\/\/\S+/g)).toEqual(["https://app.exemplo.test/recuperar-senha"]);
    expect(texto).not.toMatch(/\d{5,}/);
  });

  it("cada aviso tem um assunto diferente", async () => {
    const mailer = criarFakeMailer();
    for (const aviso of TODOS) {
      await enviarAvisoDeSeguranca(aviso, destinatario, { mailer, logger: criarFakeLogger(), appUrl: "https://app.exemplo.test" });
    }

    expect(new Set(mailer.enviados.map((email) => email.assunto)).size).toBe(TODOS.length);
  });

  it("falha no envio não estoura e vai para o log sem o endereço", async () => {
    const mailer: Mailer = { enviar: () => Promise.reject(new TypeError(`falhou para ${destinatario.email}`)) };
    const registro = criarFakeLogger();

    await expect(
      enviarAvisoDeSeguranca("senha-alterada", destinatario, { mailer, logger: registro, appUrl: "https://app.exemplo.test" }),
    ).resolves.toBeUndefined();

    expect(registro.registros.map((item) => item.nivel)).toEqual(["error"]);
    expect(JSON.stringify(registro.registros)).not.toContain(destinatario.email);
  });
});
