import type { Ramo } from "./calendario";

export type StatusRegra = "pendente" | "validada";
export type Regra = { id: string; descricao: string; referencia: Record<Ramo, string>; status: StatusRegra };

// Fonte única das regras de contagem. Uma regra só passa a `validada` quando um
// advogado confere os casos de `__fixtures__/casos-validados.json` que a exercitam.
// O espelho legível para o advogado fica em `regras.md`.
export const REGRAS = {
  diasUteis: {
    id: "R1",
    descricao: "Prazos processuais em dias contam só dias úteis.",
    referencia: { civel: "CPC, art. 219", trabalhista: "CLT, art. 775" },
    status: "pendente",
  },
  comecoEVencimento: {
    id: "R2",
    descricao: "Exclui-se o dia do começo e inclui-se o do vencimento; a contagem começa no primeiro dia útil seguinte.",
    referencia: { civel: "CPC, art. 224, caput e § 3º", trabalhista: "CLT, art. 775, caput" },
    status: "pendente",
  },
  semExpediente: {
    id: "R3",
    descricao: "Começo ou vencimento em dia sem expediente forense passa para o primeiro dia útil seguinte.",
    referencia: { civel: "CPC, art. 224, § 1º", trabalhista: "CLT, art. 775, caput; CPC, art. 224, § 1º" },
    status: "pendente",
  },
  recesso: {
    id: "R4",
    descricao: "Os prazos ficam suspensos de 20 de dezembro a 20 de janeiro, inclusive.",
    referencia: { civel: "CPC, art. 220", trabalhista: "CLT, art. 775-A" },
    status: "pendente",
  },
  emDobro: {
    id: "R5",
    descricao: "Prazo em dobro, marcado pelo advogado, dobra a quantidade de dias antes da contagem.",
    referencia: {
      civel: "CPC, arts. 180, 183 e 186",
      trabalhista: "Decreto-Lei 779/1969, art. 1º; CPC, arts. 180, 183 e 186",
    },
    status: "pendente",
  },
  disponibilizacao: {
    id: "R6",
    descricao:
      "No diário eletrônico, a publicação é o primeiro dia útil seguinte à disponibilização, e o prazo começa no primeiro dia útil seguinte à publicação.",
    referencia: {
      civel: "Lei 11.419/2006, art. 4º, §§ 3º e 4º; CPC, art. 224, § 2º",
      trabalhista: "Lei 11.419/2006, art. 4º, §§ 3º e 4º",
    },
    status: "pendente",
  },
  intimacaoEletronica: {
    id: "R7",
    descricao: "A intimação eletrônica consultada em dia não útil considera-se feita no primeiro dia útil seguinte.",
    referencia: {
      civel: "Lei 11.419/2006, art. 5º, §§ 1º e 2º",
      trabalhista: "Lei 11.419/2006, art. 5º, §§ 1º e 2º",
    },
    status: "pendente",
  },
  intimacaoTacita: {
    id: "R8",
    descricao:
      "Sem consulta em 10 dias corridos do envio, a intimação eletrônica considera-se feita ao fim desse prazo.",
    referencia: {
      civel: "Lei 11.419/2006, art. 5º, § 3º",
      trabalhista: "Lei 11.419/2006, art. 5º, § 3º",
    },
    status: "pendente",
  },
} as const satisfies Record<string, Regra>;

export type ChaveDeRegra = keyof typeof REGRAS;

export function listarRegras(): Regra[] {
  return Object.values(REGRAS);
}
