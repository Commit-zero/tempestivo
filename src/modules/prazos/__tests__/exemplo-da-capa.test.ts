import { describe, expect, it } from "vitest";
import { EXEMPLO_DE_CONTAGEM as exemplo } from "@/lib/exemplo-de-contagem";
import { somarDias } from "@/lib/datas";
import { calcularPrazo } from "../dominio/calcular-prazo";
import { criarCalendario } from "../dominio/calendario";
import { MARGEM_PADRAO_DIAS_UTEIS, metaInterna } from "../dominio/meta-interna";

// A capa mostra uma contagem. Ela não pode mostrar uma conta que o sistema não faria:
// cada dia da faixa é conferido aqui contra a calculadora e o calendário.
const calendario = criarCalendario({ tribunal: exemplo.tribunal })!;
const resultado = calcularPrazo(
  { tribunal: exemplo.tribunal, tipoEvento: "intimacao", dataEvento: exemplo.intimacao, dias: exemplo.dias, contagem: "uteis", emDobro: false },
  calendario,
);

describe("exemplo da faixa de contagem da capa", () => {
  it("tem o mesmo vencimento e a mesma meta interna que o sistema calcula", () => {
    expect(resultado).toMatchObject({ ok: true, dataFinal: exemplo.vencimento });
    expect(metaInterna(exemplo.vencimento, MARGEM_PADRAO_DIAS_UTEIS, calendario)).toBe(exemplo.metaInterna);
  });

  it("o slide mostra exatamente os passos, os avisos e as regras que a calculadora devolve", () => {
    expect(resultado).toMatchObject({
      passos: exemplo.passos, avisos: exemplo.avisos, regrasAplicadas: exemplo.regrasAplicadas,
    });
  });

  it("vai da intimação ao vencimento, um dia de cada vez", () => {
    expect(exemplo.faixa[0]).toMatchObject({ data: exemplo.intimacao, tipo: "intimacao" });
    expect(exemplo.faixa.at(-1)?.data).toBe(exemplo.vencimento);
    exemplo.faixa.slice(1).forEach((dia, posicao) => expect(dia.data).toBe(somarDias(exemplo.faixa[posicao]!.data, 1)));
  });

  it("risca exatamente os dias sem expediente, com o mesmo motivo", () => {
    for (const dia of exemplo.faixa.slice(1)) {
      const motivo = calendario.motivoSemExpediente(dia.data);
      if (motivo === null) expect(dia.tipo, dia.data).toBe("contado");
      else expect(dia, dia.data).toMatchObject({ tipo: "sem-expediente", motivo });
    }
  });

  it("numera os dias contados de 1 até o total do prazo, começando onde a calculadora começa", () => {
    const contados = exemplo.faixa.filter((dia) => dia.tipo === "contado");
    expect(contados.map((dia) => dia.numero)).toEqual(Array.from({ length: exemplo.dias }, (_, i) => i + 1));
    expect(resultado).toMatchObject({ dataInicio: contados[0]!.data });
  });
});
