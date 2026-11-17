import { describe, expect, it } from "vitest";
import {
  criarData, dataCivilEmSaoPaulo, diaDaSemana, diasEntre, ehDataCivil, formatarData,
  formatarDataComSemana, somarDias,
} from "./datas";

describe("datas civis", () => {
  it("soma dias cruzando mês, ano e ano bissexto", () => {
    expect(somarDias("2026-01-31", 1)).toBe("2026-02-01");
    expect(somarDias("2026-12-31", 1)).toBe("2027-01-01");
    expect(somarDias("2028-02-28", 1)).toBe("2028-02-29");
    expect(somarDias("2027-02-28", 1)).toBe("2027-03-01");
    expect(somarDias("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("conhece o dia da semana de datas conhecidas", () => {
    expect(diaDaSemana("2026-11-12")).toBe(4); // quinta-feira
    expect(diaDaSemana("2026-11-15")).toBe(0); // domingo
    expect(diaDaSemana("2026-12-25")).toBe(5); // sexta-feira
    expect(diaDaSemana("2027-01-20")).toBe(3); // quarta-feira
  });

  it("conta dias corridos entre duas datas", () => {
    expect(diasEntre("2026-12-20", "2027-01-20")).toBe(31);
    expect(diasEntre("2026-11-12", "2026-11-12")).toBe(0);
    expect(diasEntre("2026-11-12", "2026-11-10")).toBe(-2);
  });

  it("rejeita entrada inválida", () => {
    expect(ehDataCivil("2026-02-31")).toBe(false);
    expect(ehDataCivil("2026-13-01")).toBe(false);
    expect(ehDataCivil("25/11/2026")).toBe(false);
    expect(ehDataCivil("2026-11-25T00:00:00Z")).toBe(false);
    expect(ehDataCivil(20261125)).toBe(false);
    expect(ehDataCivil("2026-11-25")).toBe(true);
    expect(() => somarDias("2026-02-30", 1)).toThrow(RangeError);
    expect(() => criarData(2026, 2, 30)).toThrow(RangeError);
  });

  it("formata no padrão brasileiro", () => {
    expect(formatarData("2026-11-25")).toBe("25/11/2026");
    expect(formatarDataComSemana("2026-11-25")).toBe("25/11/2026 (quarta-feira)");
  });

  it("converte um instante para a data civil de São Paulo, não a de UTC", () => {
    // 01:30 UTC de 13/11 ainda é 22:30 de 12/11 em São Paulo.
    expect(dataCivilEmSaoPaulo(new Date("2026-11-13T01:30:00Z"))).toBe("2026-11-12");
    expect(dataCivilEmSaoPaulo(new Date("2026-11-13T03:00:00Z"))).toBe("2026-11-13");
  });
});

describe("formatarDataHora", () => {
  it("mostra a data e a hora de São Paulo", async () => {
    const { formatarDataHora } = await import("./datas");
    expect(formatarDataHora(new Date("2026-11-13T01:30:00Z"))).toBe("12/11/2026 às 22:30");
  });
});
