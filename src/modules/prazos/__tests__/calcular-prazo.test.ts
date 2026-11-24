import { describe, expect, it } from "vitest";
import casosValidados from "../__fixtures__/casos-validados.json";
import {
  AVISO_CALCULO_AUXILIAR, AVISO_REGRAS_PENDENTES, calcularPrazo, type EntradaCalculo, type ResultadoCalculo,
} from "../dominio/calcular-prazo";
import { criarCalendario } from "../dominio/calendario";
import { somarDias } from "@/lib/datas";
import { listarRegras } from "../dominio/regras";

const base: EntradaCalculo = {
  tribunal: "TJSP", tipoEvento: "intimacao", dataEvento: "2026-03-02", dias: 5, contagem: "uteis", emDobro: false,
};

function calcular(entrada: Partial<EntradaCalculo> = {}, diasSemExpediente: { data: string; motivo: string }[] = []) {
  const completa = { ...base, ...entrada };
  return calcularPrazo(completa, criarCalendario({ tribunal: completa.tribunal, diasSemExpediente }));
}

function exigirOk(resultado: ResultadoCalculo) {
  if (!resultado.ok) throw new Error(`recusou: ${resultado.motivo}`);
  return resultado;
}

describe("casos para validação do advogado", () => {
  it("tem pelo menos 15 casos, todos com regra conhecida", () => {
    const ids = new Set(listarRegras().map((regra) => regra.id));
    expect(casosValidados.casos.length).toBeGreaterThanOrEqual(15);
    for (const caso of casosValidados.casos) {
      expect(caso.regras.every((regra) => ids.has(regra)), caso.id).toBe(true);
    }
  });

  it.each(casosValidados.casos)("$id: $descricao", (caso) => {
    const resultado = exigirOk(calcular(caso.entrada as EntradaCalculo));

    expect(resultado.dataInicio).toBe(caso.esperado.dataInicio);
    expect(resultado.dataFinal).toBe(caso.esperado.dataFinal);
    for (const regra of caso.regras) {
      expect(resultado.regrasAplicadas.some((aplicada) => aplicada.startsWith(`${regra}:`)), `${caso.id} aplica ${regra}`).toBe(true);
    }
  });
});

describe("passos, avisos e regras", () => {
  it("sempre traz o aviso de cálculo auxiliar e um passo a passo legível", () => {
    const resultado = exigirOk(calcular());

    expect(resultado.avisos[0]).toBe(AVISO_CALCULO_AUXILIAR);
    expect(resultado.passos.at(-1)).toBe("Data final: 09/03/2026 (segunda-feira).");
    expect(resultado.passos.join(" ")).toContain("02/03/2026 (segunda-feira)");
  });

  it("avisa enquanto alguma regra aplicada estiver pendente de validação", () => {
    expect(exigirOk(calcular()).avisos).toContain(AVISO_REGRAS_PENDENTES);
  });

  it("cita a CLT no trabalhista e o CPC no cível", () => {
    expect(exigirOk(calcular()).regrasAplicadas.join(" ")).toContain("CPC, art. 219");
    expect(exigirOk(calcular({ tribunal: "TRT-2" })).regrasAplicadas.join(" ")).toContain("CLT, art. 775");
  });

  it("lista no passo a passo o feriado que ficou fora da contagem", () => {
    const resultado = exigirOk(calcular({ dataEvento: "2026-11-12", dias: 15 }));

    expect(resultado.passos.join(" ")).toContain("20/11/2026 (feriado: Consciência Negra)");
  });

  it("explica a suspensão do recesso", () => {
    const resultado = exigirOk(calcular({ dataEvento: "2026-12-14", dias: 15 }));

    expect(resultado.passos.join(" ")).toContain("suspenso durante o recesso");
  });

  it("explica o prazo em dobro", () => {
    const resultado = exigirOk(calcular({ dias: 15, emDobro: true }));

    expect(resultado.passos).toContain("Prazo em dobro: 15 dias viram 30 dias.");
  });
});

describe("dias que dependem de portaria do tribunal", () => {
  it("conta Corpus Christi como útil e avisa, em vez de presumir a suspensão", () => {
    const resultado = exigirOk(calcular({ dataEvento: "2026-06-01" }));

    expect(resultado.dataFinal).toBe("2026-06-08");
    expect(resultado.avisos.some((aviso) => aviso.includes("04/06/2026 é Corpus Christi"))).toBe(true);
  });

  it("pula o dia quando o advogado cadastra que não houve expediente, e o aviso some", () => {
    const resultado = exigirOk(
      calcular({ dataEvento: "2026-06-01" }, [{ data: "2026-06-04", motivo: "Corpus Christi (portaria)" }]),
    );

    expect(resultado.dataFinal).toBe("2026-06-09");
    expect(resultado.avisos.some((aviso) => aviso.includes("Corpus Christi"))).toBe(false);
    expect(resultado.passos.join(" ")).toContain("04/06/2026 (sem expediente: Corpus Christi (portaria))");
  });

  it("no TRT-2, cita a Lei 5.010 nos dias que ela fixa como feriado, sem deixar de contá-los", () => {
    const resultado = exigirOk(calcular({ tribunal: "TRT-2", dataEvento: "2026-02-13" }));

    expect(resultado.dataFinal).toBe("2026-02-20");
    expect(resultado.avisos.some((aviso) => aviso.includes("16/02/2026 é segunda-feira de Carnaval, feriado da Justiça do Trabalho pela Lei 5.010/1966"))).toBe(true);
    expect(exigirOk(calcular({ dataEvento: "2026-02-13" })).avisos.some((aviso) => aviso.includes("Lei 5.010"))).toBe(false);
  });

  it("avisa sobre o feriado municipal de 25/01 na capital", () => {
    const resultado = exigirOk(calcular({ dataEvento: "2026-12-14", dias: 15 }));

    expect(resultado.avisos.some((aviso) => aviso.includes("25/01/2027 é aniversário de São Paulo"))).toBe(true);
  });

  it("avisa sobre a Semana Santa quando o prazo passa por ela", () => {
    const resultado = exigirOk(calcular({ dias: 15, emDobro: true }));

    expect(resultado.avisos.some((aviso) => aviso.includes("01/04/2026"))).toBe(true);
    expect(resultado.avisos.some((aviso) => aviso.includes("02/04/2026"))).toBe(true);
  });
});

describe("recusa segura", () => {
  const recusas: [string, Partial<EntradaCalculo>][] = [
    ["tribunal fora do escopo", { tribunal: "TJRJ" }],
    ["prazo em horas", { unidade: "horas" }],
    ["zero dias", { dias: 0 }],
    ["dias fracionados", { dias: 1.5 }],
    ["dias negativos", { dias: -3 }],
    ["dias acima do limite", { dias: 366 }],
    ["data inexistente", { dataEvento: "2026-02-30" }],
    ["data em outro formato", { dataEvento: "02/03/2026" }],
    ["contagem desconhecida", { contagem: "semanas" as never }],
    ["tipo de evento desconhecido", { tipoEvento: "boato" as never }],
    ["intimação tácita cujos 10 dias passam pelo recesso", { tipoEvento: "intimacao_tacita", dataEvento: "2026-12-15" }],
    ["prazo em dias corridos, fora do escopo", { contagem: "corridos" }],
    ["prazo em dias corridos que terminaria logo antes do recesso", { contagem: "corridos", dataEvento: "2026-12-10", dias: 9 }],
  ];

  it.each(recusas)("recusa %s e pede a data manual", (_nome, entrada) => {
    const resultado = calcular(entrada);

    expect(resultado.ok).toBe(false);
    if (!resultado.ok) expect(resultado.motivo).toContain("Informe a data final manualmente.");
  });

  it("recusa quando o calendário é de outro tribunal", () => {
    const resultado = calcularPrazo(base, criarCalendario({ tribunal: "TRT-2" }));

    expect(resultado.ok).toBe(false);
  });
});

describe("propriedades da contagem", () => {
  const calendarios = { TJSP: criarCalendario({ tribunal: "TJSP" })!, "TRT-2": criarCalendario({ tribunal: "TRT-2" })! };
  const quantidades = [1, 2, 5, 8, 15, 30];
  const eventos = ["intimacao", "disponibilizacao", "publicacao"] as const;

  it("nunca vence em dia sem expediente nem no recesso, e mais dias nunca antecipam a data", () => {
    // As violações são juntadas e conferidas uma vez só: são mais de 26 mil cálculos.
    const violacoes: string[] = [];
    for (let data = "2026-01-01"; data <= "2027-12-31"; data = somarDias(data, 1)) {
      for (const tribunal of ["TJSP", "TRT-2"] as const) {
        const calendario = calendarios[tribunal];
        for (const tipoEvento of eventos) {
          let anterior = "";
          for (const dias of quantidades) {
            const resultado = exigirOk(
              calcularPrazo({ tribunal, tipoEvento, dataEvento: data, dias, contagem: "uteis", emDobro: false }, calendario),
            );
            const valido =
              calendario.motivoSemExpediente(resultado.dataFinal) === null &&
              !calendario.emRecesso(resultado.dataFinal) &&
              calendario.motivoSemExpediente(resultado.dataInicio) === null &&
              !calendario.emRecesso(resultado.dataInicio) &&
              resultado.dataInicio > data &&
              resultado.dataFinal >= resultado.dataInicio &&
              resultado.dataFinal >= anterior;
            if (!valido) violacoes.push(`${tribunal} ${tipoEvento} ${data} ${dias}d -> ${resultado.dataFinal}`);
            anterior = resultado.dataFinal;
          }
        }
      }
    }
    expect(violacoes).toEqual([]);
    // Varre o calendário inteiro: cerca de 10 s sozinho com a cobertura ligada, e o dobro
    // com os outros arquivos rodando em paralelo. O prazo próprio evita falso alarme.
  }, 60_000);

  it("evento em qualquer dia da suspensão começa a contar no primeiro dia útil depois de 20/01", () => {
    // A suspensão impede o prazo de correr, mas não adia o dia do começo: a contagem
    // nunca começa depois do primeiro dia útil que conta após o recesso.
    const calendario = calendarios.TJSP;
    const inicios = new Map([["2026", "2026-01-21"], ["2027", "2027-01-21"]]);
    const violacoes: string[] = [];
    for (const [anoDoFim, inicioEsperado] of inicios) {
      for (let data = `${Number(anoDoFim) - 1}-12-20`; data <= `${anoDoFim}-01-20`; data = somarDias(data, 1)) {
        for (const tipoEvento of ["intimacao", "publicacao", "disponibilizacao"] as const) {
          if (tipoEvento === "disponibilizacao" && data === `${anoDoFim}-01-20`) continue;
          const resultado = exigirOk(
            calcularPrazo({ tribunal: "TJSP", tipoEvento, dataEvento: data, dias: 1, contagem: "uteis", emDobro: false }, calendario),
          );
          if (resultado.dataInicio !== inicioEsperado) violacoes.push(`${tipoEvento} ${data} -> ${resultado.dataInicio}`);
        }
      }
    }
    expect(violacoes).toEqual([]);
  });

  it("nenhuma data final sai mais tarde do que a de um evento no dia seguinte", () => {
    // Propriedade de segurança: adiar o evento nunca antecipa o vencimento, e
    // antecipá-lo nunca atrasa. Pega qualquer erro que empurre a data para frente.
    const violacoes: string[] = [];
    for (let data = "2026-01-01"; data <= "2027-12-30"; data = somarDias(data, 1)) {
      for (const tipoEvento of eventos) {
        const hoje = calcularPrazo({ tribunal: "TJSP", tipoEvento, dataEvento: data, dias: 5, contagem: "uteis", emDobro: false }, calendarios.TJSP);
        const amanha = calcularPrazo(
          { tribunal: "TJSP", tipoEvento, dataEvento: somarDias(data, 1), dias: 5, contagem: "uteis", emDobro: false },
          calendarios.TJSP,
        );
        if (hoje.ok && amanha.ok && hoje.dataFinal > amanha.dataFinal) violacoes.push(`${tipoEvento} ${data}: ${hoje.dataFinal} > ${amanha.dataFinal}`);
      }
    }
    expect(violacoes).toEqual([]);
    // Varre o calendário inteiro: cerca de 10 s sozinho com a cobertura ligada, e o dobro
    // com os outros arquivos rodando em paralelo. O prazo próprio evita falso alarme.
  }, 60_000);

  it("o prazo em dobro é igual ao prazo simples com o dobro de dias", () => {
    for (let data = "2026-01-05"; data <= "2026-12-28"; data = somarDias(data, 7)) {
      const emDobro = exigirOk(calcular({ dataEvento: data, dias: 15, emDobro: true }));
      const dobrado = exigirOk(calcular({ dataEvento: data, dias: 30 }));
      expect(emDobro.dataFinal).toBe(dobrado.dataFinal);
    }
  });
});
