import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { getPrisma } from "@/platform/database";
import { apagarRegistrosVencidos } from "./limpeza";

// A sessão guarda IP e navegador: depois de vencida, não há por que mantê-la.
// O teste usa um relógio no ano 2000, para a limpeza só alcançar o que ele mesmo criou:
// os outros arquivos de teste rodam em paralelo no mesmo banco.
const AGORA = new Date("2000-06-15T12:00:00Z");
const ANTES = new Date("2000-06-15T11:59:00Z");
const DEPOIS = new Date("2000-06-15T12:01:00Z");

const usuario = randomUUID();
const prefixo = `limpeza-${randomUUID()}`;

afterAll(async () => {
  await getPrisma().verification.deleteMany({ where: { identifier: { startsWith: prefixo } } });
  await getPrisma().user.deleteMany({ where: { id: usuario } });
});

describe("limpeza dos registros vencidos", () => {
  it("apaga sessões e códigos vencidos, mantém os válidos e pode rodar de novo", async () => {
    await getPrisma().user.create({ data: { id: usuario, name: "Pessoa Fictícia", email: `${usuario}@exemplo.test` } });
    for (const [nome, expiresAt] of [["vencida", ANTES], ["valida", DEPOIS]] as const) {
      await getPrisma().session.create({
        data: { id: `${prefixo}-${nome}`, token: `${prefixo}-${nome}`, userId: usuario, expiresAt, ipAddress: "192.0.2.1", userAgent: "Navegador Fictício" },
      });
      await getPrisma().verification.create({
        data: { id: `${prefixo}-${nome}`, identifier: `${prefixo}-${nome}`, value: usuario, expiresAt },
      });
    }

    const primeira = await apagarRegistrosVencidos(AGORA);

    expect(primeira.sessoes).toBeGreaterThanOrEqual(1);
    expect(primeira.codigos).toBeGreaterThanOrEqual(1);
    const sessoes = await getPrisma().session.findMany({ where: { userId: usuario }, select: { token: true } });
    expect(sessoes).toEqual([{ token: `${prefixo}-valida` }]);
    const codigos = await getPrisma().verification.findMany({ where: { identifier: { startsWith: prefixo } }, select: { identifier: true } });
    expect(codigos).toEqual([{ identifier: `${prefixo}-valida` }]);

    expect(await apagarRegistrosVencidos(AGORA)).toEqual({ sessoes: 0, codigos: 0 });
  });
});
