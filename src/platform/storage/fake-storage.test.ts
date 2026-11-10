import { describe, expect, it } from "vitest";
import { criarStorage } from "./index";
import { criarFakeStorage } from "./fake-storage";

const bytes = new TextEncoder().encode("conteúdo fictício");

describe("fake storage", () => {
  it("salvar + linkTemporario devolve um link que contém a chave", async () => {
    const storage = criarFakeStorage();
    await storage.salvar("conta-1/doc.pdf", bytes, "application/pdf");
    const link = await storage.linkTemporario("conta-1/doc.pdf", 60);
    expect(link).toContain("conta-1/doc.pdf");
  });

  it.each([0, -1])("linkTemporario com validade %i lança erro", async (validade) => {
    const storage = criarFakeStorage();
    await storage.salvar("a", bytes, "text/plain");
    await expect(storage.linkTemporario("a", validade)).rejects.toThrow();
  });

  it("linkTemporario de chave inexistente lança erro", async () => {
    await expect(criarFakeStorage().linkTemporario("nada", 60)).rejects.toThrow();
  });

  it("remover apaga e o link seguinte falha", async () => {
    const storage = criarFakeStorage();
    await storage.salvar("a", bytes, "text/plain");
    await storage.remover("a");
    expect(storage.arquivos.has("a")).toBe(false);
    await expect(storage.linkTemporario("a", 60)).rejects.toThrow();
  });

  it("guarda conteúdo e tipo", async () => {
    const storage = criarFakeStorage();
    await storage.salvar("a", bytes, "text/plain");
    expect(storage.arquivos.get("a")).toEqual({ conteudo: bytes, tipo: "text/plain" });
  });
});

describe("criarStorage", () => {
  it("devolve o fake com STORAGE_DRIVER=fake", () => {
    expect(criarStorage({ STORAGE_DRIVER: "fake" })).toHaveProperty("arquivos");
  });
});
