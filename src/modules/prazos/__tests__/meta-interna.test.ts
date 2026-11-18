import { describe, expect, it } from "vitest";
import { somarDias } from "@/lib/datas";
import { criarCalendario } from "../dominio/calendario";
import { MARGEM_MAXIMA } from "@/modules/conta";
import { MARGEM_MAXIMA_DIAS_UTEIS, metaInterna } from "../dominio/meta-interna";

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

  it("trata ponto facultativo do tribunal como dia sem trabalho: na contagem para trás, o lado seguro é a meta mais cedo", () => {
    // 11/12/2026 é sexta; 08/12 (Dia da Justiça) depende de portaria. Margem 4: 10, 09, 07 e 04/12.
    expect(metaInterna("2026-12-11", 4, tjsp)).toBe("2026-12-04");
    // Quarta de Cinzas 10/02/2027, margem 2: pula segunda e terça de Carnaval (08 e 09/02).
    expect(metaInterna("2027-02-10", 2, tjsp)).toBe("2027-02-04");
    // Terça de Carnaval 2026 (17/02) não é a meta de um prazo em 18/02.
    expect(metaInterna("2026-02-18", 1, tjsp)).toBe("2026-02-13");
  });

  it("o teto da margem é o mesmo da tela da conta", () => {
    expect(MARGEM_MAXIMA_DIAS_UTEIS).toBe(MARGEM_MAXIMA);
  });

  it("sem calendário do tribunal, usa fins de semana e feriados nacionais", () => {
    expect(metaInterna("2026-11-23", 1, null)).toBe("2026-11-19");
  });

  it("a meta nunca cai em dia sem expediente nem em ponto facultativo, e nunca passa do vencimento", () => {
    // Dois anos inteiros: pega Carnaval, Semana Santa, Corpus Christi e os pontos de fim de ano.
    let vencimento = "2026-01-01";
    while (vencimento <= "2027-12-31") {
      for (const margem of [1, 2, 3, 5, 10]) {
        const meta = metaInterna(vencimento, margem, tjsp);
        expect(meta < vencimento, `${vencimento} ${margem}`).toBe(true);
        expect(tjsp!.motivoSemExpediente(meta), `${vencimento} ${margem}`).toBeNull();
        expect(tjsp!.pontoDependente(meta), `${vencimento} ${margem}`).toBeNull();
      }
      vencimento = somarDias(vencimento, 1);
    }
  });
});
