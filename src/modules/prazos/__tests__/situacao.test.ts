import { describe, expect, it } from "vitest";
import { situacaoDoPrazo, type DadosDaSituacao } from "../dominio/situacao";

// 12/11/2026 ao meio-dia em São Paulo.
const agora = new Date("2026-11-12T15:00:00Z");
const base: DadosDaSituacao = {
  status: "pendente", dataFinal: "2026-11-20", ultimaConferenciaEm: null, criadoEm: new Date("2026-11-12T12:00:00Z"),
};

describe("status honesto", () => {
  it("diz quando vence em linguagem direta", () => {
    expect(situacaoDoPrazo({ ...base, dataFinal: "2026-11-20" }, agora).quando).toBe("vence em 8 dias");
    expect(situacaoDoPrazo({ ...base, dataFinal: "2026-11-13" }, agora).quando).toBe("vence amanhã");
    expect(situacaoDoPrazo({ ...base, dataFinal: "2026-11-12" }, agora).quando).toBe("vence hoje");
    expect(situacaoDoPrazo({ ...base, dataFinal: "2026-11-11" }, agora).quando).toBe("venceu há 1 dia");
    expect(situacaoDoPrazo({ ...base, dataFinal: "2026-11-02" }, agora).quando).toBe("venceu há 10 dias");
  });

  it("vencido é derivado da data e some quando o prazo é cumprido", () => {
    const vencido = situacaoDoPrazo({ ...base, dataFinal: "2026-11-11" }, agora);
    expect(vencido).toMatchObject({ vencido: true, urgencia: "vencido", diasRestantes: -1 });

    const cumprido = situacaoDoPrazo({ ...base, dataFinal: "2026-11-11", status: "cumprido" }, agora);
    expect(cumprido).toMatchObject({ vencido: false, urgencia: "cumprido", quando: "cumprido", conferencia: "" });
  });

  it("classifica a urgência: hoje, próximos 7 dias e normal", () => {
    expect(situacaoDoPrazo({ ...base, dataFinal: "2026-11-12" }, agora).urgencia).toBe("hoje");
    expect(situacaoDoPrazo({ ...base, dataFinal: "2026-11-19" }, agora).urgencia).toBe("proximo");
    expect(situacaoDoPrazo({ ...base, dataFinal: "2026-11-20" }, agora).urgencia).toBe("normal");
  });

  it("mostra há quantos dias o advogado conferiu", () => {
    const conferidoHoje = { ...base, status: "confirmado" as const, ultimaConferenciaEm: new Date("2026-11-12T13:00:00Z") };
    expect(situacaoDoPrazo(conferidoHoje, agora)).toMatchObject({ conferencia: "conferido hoje", conferenciaAtrasada: false });

    const haDoisDias = { ...conferidoHoje, ultimaConferenciaEm: new Date("2026-11-10T13:00:00Z") };
    expect(situacaoDoPrazo(haDoisDias, agora)).toMatchObject({ conferencia: "conferido há 2 dias", conferenciaAtrasada: false });
  });

  it("destaca a partir de 3 dias sem conferência, mesmo que já tenha sido conferido antes", () => {
    const haTresDias = { ...base, status: "confirmado" as const, ultimaConferenciaEm: new Date("2026-11-09T13:00:00Z") };
    expect(situacaoDoPrazo(haTresDias, agora)).toMatchObject({ conferencia: "conferido há 3 dias", conferenciaAtrasada: true });
  });

  it("prazo nunca conferido conta os dias desde o cadastro", () => {
    expect(situacaoDoPrazo(base, agora)).toMatchObject({ conferencia: "ainda não conferido", conferenciaAtrasada: false });

    const antigo = { ...base, criadoEm: new Date("2026-11-08T12:00:00Z") };
    expect(situacaoDoPrazo(antigo, agora)).toMatchObject({ conferencia: "sem conferência há 4 dias", conferenciaAtrasada: true });
  });

  it("usa o dia de São Paulo, não o de UTC, na virada da noite", () => {
    // 01:00 UTC de 13/11 ainda é 22:00 de 12/11 em São Paulo.
    const noite = new Date("2026-11-13T01:00:00Z");
    expect(situacaoDoPrazo({ ...base, dataFinal: "2026-11-12" }, noite).quando).toBe("vence hoje");
  });
});
