import { describe, expect, it } from "vitest";
import { criarFakeExtrator } from "./fake-extrator";
import { criarExtrator } from "./index";

describe("fake extrator", () => {
  it("devolve a resposta programada e guarda o texto recebido", async () => {
    const resposta = { numeroProcesso: "0000000-00.2026.8.26.0000" };
    const extrator = criarFakeExtrator(resposta);
    await expect(extrator.extrair("Intimação fictícia.")).resolves.toBe(resposta);
    expect(extrator.recebidos).toEqual(["Intimação fictícia."]);
  });

  it("devolve objeto vazio quando nada foi programado", async () => {
    await expect(criarFakeExtrator().extrair("texto")).resolves.toEqual({});
  });

  it("texto vazio lança erro e não guarda", async () => {
    const extrator = criarFakeExtrator();
    await expect(extrator.extrair("  ")).rejects.toThrow();
    expect(extrator.recebidos).toHaveLength(0);
  });
});

describe("criarExtrator", () => {
  it("devolve o extrator local com AI_DRIVER=local", async () => {
    const rascunho = await criarExtrator({ AI_DRIVER: "local" }).extrair("Prazo de 5 dias.");
    expect(rascunho).toMatchObject({ dias: 5 });
  });
});
