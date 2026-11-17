import { describe, expect, it } from "vitest";
import { criarCalendario } from "../dominio/calendario";
import { metaInterna } from "../dominio/meta-interna";

const tjsp = criarCalendario({ tribunal: "TJSP" });

describe("meta interna", () => {
  it("fica N dias úteis antes do vencimento, pulando fim de semana", () => {
    // 04/12/2026 é sexta; 2 dias úteis antes: quarta 02/12.
    expect(metaInterna("2026-12-04", 2, tjsp)).toBe("2026-12-02");
    // 07/12/2026 é segunda: 1 dia útil antes é a sexta 04/12.
    expect(metaInterna("2026-12-07", 1, tjsp)).toBe("2026-12-04");
  });

  it("pula feriados e os dias sem expediente cadastrados pelo advogado", () => {
    // 23/11/2026 é segunda; sexta 20/11 é feriado (Consciência Negra).
    expect(metaInterna("2026-11-23", 1, tjsp)).toBe("2026-11-19");
    const comPortaria = criarCalendario({ tribunal: "TJSP", diasSemExpediente: [{ data: "2026-11-19", motivo: "portaria" }] });
    expect(metaInterna("2026-11-23", 1, comPortaria)).toBe("2026-11-18");
  });

  it("não pula a suspensão de janeiro: o escritório trabalha nela", () => {
    // 21/01/2027 é quinta; 2 dias úteis antes: terça 19/01, dentro da suspensão.
    expect(metaInterna("2027-01-21", 2, tjsp)).toBe("2027-01-19");
  });

  it("margem zero é o próprio vencimento, e a margem é limitada a 10", () => {
    expect(metaInterna("2026-12-04", 0, tjsp)).toBe("2026-12-04");
    expect(metaInterna("2026-12-04", -3, tjsp)).toBe("2026-12-04");
    expect(metaInterna("2026-12-04", 99, tjsp)).toBe(metaInterna("2026-12-04", 10, tjsp));
  });

  it("sem calendário do tribunal, usa fins de semana e feriados nacionais", () => {
    expect(metaInterna("2026-11-23", 1, null)).toBe("2026-11-19");
  });

  it("a meta nunca cai em dia sem expediente e nunca passa do vencimento", () => {
    for (let dia = 1; dia <= 28; dia += 1) {
      const vencimento = `2026-03-${String(dia).padStart(2, "0")}`;
      for (const margem of [1, 2, 3, 5]) {
        const meta = metaInterna(vencimento, margem, tjsp);
        expect(meta < vencimento, `${vencimento} ${margem}`).toBe(true);
        expect(tjsp!.motivoSemExpediente(meta), `${vencimento} ${margem}`).toBeNull();
      }
    }
  });
});
