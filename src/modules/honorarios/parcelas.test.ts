import { describe, expect, it } from "vitest";
import { formatarReais, lerReais } from "@/lib/dinheiro";
import { dividirEmParcelas, linkDeCobranca, situacaoDaParcela, type DadosDaCobranca } from "./parcelas";

describe("dinheiro", () => {
  it("lê valores no padrão brasileiro e devolve centavos", () => {
    expect(lerReais("1.500,00")).toBe(150_000);
    expect(lerReais("1500")).toBe(150_000);
    expect(lerReais("R$ 99,9")).toBe(9_990);
    expect(lerReais("0,01")).toBe(1);
  });

  it("recusa zero, negativo, texto e mais de duas casas", () => {
    for (const invalido of ["0", "0,00", "-10", "abc", "10,999", "", "1,5,0"]) expect(lerReais(invalido), invalido).toBeNull();
  });

  it("formata em reais", () => {
    expect(formatarReais(150_000)).toBe("R$ 1.500,00");
    expect(formatarReais(1)).toBe("R$ 0,01");
  });
});

describe("parcelas", () => {
  it("a soma das parcelas é sempre o total, com a sobra na primeira", () => {
    const parcelas = dividirEmParcelas(100_000, 3, "2026-11-10");

    expect(parcelas.map((parcela) => parcela.valorCentavos)).toEqual([33_334, 33_333, 33_333]);
    for (const [total, quantidade] of [[100_001, 7], [99, 12], [1, 1], [123_457, 24]] as const) {
      const soma = dividirEmParcelas(total, quantidade, "2026-01-15").reduce((acumulado, parcela) => acumulado + parcela.valorCentavos, 0);
      expect(soma).toBe(total);
    }
  });

  it("vence no mesmo dia a cada mês, virando o ano", () => {
    expect(dividirEmParcelas(30_000, 3, "2026-11-10").map((parcela) => parcela.vencimento)).toEqual(["2026-11-10", "2026-12-10", "2027-01-10"]);
  });

  it("dia 31 cai no último dia dos meses mais curtos, sem deslocar os seguintes", () => {
    expect(dividirEmParcelas(40_000, 4, "2027-01-31").map((parcela) => parcela.vencimento)).toEqual([
      "2027-01-31", "2027-02-28", "2027-03-31", "2027-04-30",
    ]);
    expect(dividirEmParcelas(20_000, 2, "2028-01-31")[1].vencimento).toBe("2028-02-29");
  });

  it("classifica a situação da parcela pela data de hoje", () => {
    const hoje = "2026-11-12";
    expect(situacaoDaParcela({ vencimento: "2026-11-11", pagaEm: null }, hoje)).toBe("em_atraso");
    expect(situacaoDaParcela({ vencimento: "2026-11-12", pagaEm: null }, hoje)).toBe("vence_hoje");
    expect(situacaoDaParcela({ vencimento: "2026-11-13", pagaEm: null }, hoje)).toBe("a_vencer");
    expect(situacaoDaParcela({ vencimento: "2026-11-01", pagaEm: new Date() }, hoje)).toBe("paga");
  });
});

describe("cobrança pelo WhatsApp", () => {
  const base: DadosDaCobranca = {
    nomeDoCliente: "Ana Fictícia", telefone: "11912345678", descricao: "Ação de cobrança", numero: 2, totalDeParcelas: 3,
    valorCentavos: 50_000, vencimento: "2026-11-10", situacao: "em_atraso", remetente: "Dra. Fictícia",
  };

  it("monta o link wa.me com DDI e a mensagem codificada", () => {
    const link = linkDeCobranca(base)!;

    expect(link.startsWith("https://wa.me/5511912345678?text=")).toBe(true);
    const mensagem = decodeURIComponent(link.split("?text=")[1]);
    expect(mensagem).toContain("Olá, Ana.");
    expect(mensagem).toContain("a parcela 2 de 3");
    expect(mensagem).toContain("R$ 500,00");
    expect(mensagem).toContain("venceu em 10/11/2026");
  });

  it("fala no futuro quando a parcela ainda não venceu e em 'o valor' quando é parcela única", () => {
    const mensagem = decodeURIComponent(linkDeCobranca({ ...base, situacao: "a_vencer", numero: 1, totalDeParcelas: 1 })!.split("?text=")[1]);

    expect(mensagem).toContain("vence em 10/11/2026");
    expect(mensagem).toContain("o valor dos honorários");
  });

  it("não gera link sem telefone válido nem para parcela paga", () => {
    expect(linkDeCobranca({ ...base, telefone: null })).toBeNull();
    expect(linkDeCobranca({ ...base, telefone: "123" })).toBeNull();
    expect(linkDeCobranca({ ...base, situacao: "paga" })).toBeNull();
  });
});
