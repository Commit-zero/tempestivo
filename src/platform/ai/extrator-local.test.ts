import { describe, expect, it } from "vitest";
import { criarExtratorLocal } from "./extrator-local";

const extrair = (texto: string) => criarExtratorLocal().extrair(texto) as Promise<Record<string, unknown> & { evidencias: Record<string, string> }>;

// Textos fictícios, no formato usual de intimações.
describe("extrator local", () => {
  it("lê número, prazo, contagem, evento, data e tipo do ato de uma intimação do diário", async () => {
    const rascunho = await extrair(
      "Processo 0001234-03.2026.8.26.0100 - Procedimento Comum Cível. Disponibilizado no DJe em 12/11/2026. " +
        "Fica a parte ré intimada para apresentar contestação no prazo de 15 (quinze) dias úteis.",
    );

    expect(rascunho).toMatchObject({
      numeroProcesso: "00012340320268260100", dias: 15, contagem: "uteis", tipoEvento: "disponibilizacao",
      dataEvento: "2026-11-12", descricao: "Contestação", confianca: "alta",
    });
    expect(rascunho.evidencias.dias).toContain("prazo de 15 (quinze) dias úteis");
  });

  it("entende data por extenso e publicação", async () => {
    const rascunho = await extrair("Publicação realizada em 3 de março de 2026. Manifeste-se o autor sobre a contestação em 15 dias.");

    expect(rascunho).toMatchObject({ tipoEvento: "publicacao", dataEvento: "2026-03-03", dias: 15, descricao: "Réplica" });
    expect(rascunho.contagem).toBeUndefined();
  });

  it("reconhece ciência da intimação, dias corridos e prazo em dobro", async () => {
    const rascunho = await extrair("Ciência da intimação em 05.02.2027. Prazo de 30 dias corridos. Observe-se o prazo em dobro da Fazenda Pública.");

    expect(rascunho).toMatchObject({ tipoEvento: "intimacao", dataEvento: "2027-02-05", dias: 30, contagem: "corridos", emDobro: true });
  });

  it("prefere o ato mais específico", async () => {
    expect((await extrair("Intime-se para manifestação sobre os embargos de declaração no prazo de 5 dias.")).descricao).toBe("Embargos de declaração");
    expect((await extrair("Vista para contrarrazões ao recurso de apelação, prazo de 15 dias.")).descricao).toBe("Contrarrazões de recurso");
  });

  it("data sem contexto vira palpite e baixa a confiança", async () => {
    const rascunho = await extrair("São Paulo, 10/11/2026. Prazo de 5 dias para manifestação.");

    expect(rascunho).toMatchObject({ dataEvento: "2026-11-10", dataIncerta: true, dias: 5, confianca: "media" });
    expect(rascunho.tipoEvento).toBeUndefined();
  });

  it("não inventa: sem prazo nem data, devolve confiança baixa e campos em branco", async () => {
    const rascunho = await extrair("Vistos. Aguarde-se o retorno dos autos da instância superior.");

    expect(rascunho.confianca).toBe("baixa");
    expect(rascunho.dias).toBeUndefined();
    expect(rascunho.dataEvento).toBeUndefined();
    expect(rascunho.numeroProcesso).toBeUndefined();
  });

  it("ignora data impossível e recusa texto vazio", async () => {
    expect((await extrair("Publicado em 31/02/2026. Prazo de 5 dias.")).dataEvento).toBeUndefined();
    await expect(extrair("   ")).rejects.toThrow();
  });
});
