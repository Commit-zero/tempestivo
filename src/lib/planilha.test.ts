import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { lerPlanilha, valores } from "@/test/ler-planilha";
import { celula, gerarPlanilha, type Aba } from "./planilha";

// Provas do que a documentação da biblioteca não diz. Se alguma falhar numa
// atualização, a planilha pode sair errada ou perigosa.

const aba = (linhas: Aba["linhas"], colunas = 1): Aba => ({
  nome: "Teste",
  colunas: Array.from({ length: colunas }, (_, i) => ({ titulo: `Coluna ${i + 1}`, largura: 20 + i })),
  linhas,
});
const gerar = async (linhas: Aba["linhas"], colunas = 1) => lerPlanilha(await gerarPlanilha([aba(linhas, colunas)]));

// Um fuso bem longe de São Paulo: as datas não podem depender do computador.
const fusoOriginal = process.env.TZ;
beforeAll(() => {
  process.env.TZ = "Pacific/Kiritimati";
});
afterAll(() => {
  if (fusoOriginal === undefined) delete process.env.TZ;
  else process.env.TZ = fusoOriginal;
});

describe("texto digitado", () => {
  const PERIGOSOS = ["=1+1", "+cmd|' /C calc'!A0", "-2+3", "@SOMA(A1)", '=HYPERLINK("http://golpe.test";"clique")', "\t=1", "<f>1+1</f>"];

  it("nunca vira fórmula: é gravado como texto, igual ao digitado", async () => {
    const lida = await gerar(PERIGOSOS.map((valor) => [celula.texto(valor)]));

    expect(lida.temFormula).toBe(false);
    expect(lida.abas[0]!.linhas.slice(1).map((linha) => linha[0])).toEqual(
      PERIGOSOS.map((valor) => expect.objectContaining({ tipo: "texto", valor })),
    );
  });

  it("tira caracteres que o XML não aceita, sem perder o resto nem os emojis", async () => {
    const lida = await gerar([
      [celula.texto("a\u0000b\u0008c\u001Fd")], [celula.texto("solto\uD800aqui\uDC00fim")], [celula.texto("ação 😀👍 ✓")],
      [celula.texto("linha 1\nlinha 2 & <tag> \"aspas\"")],
    ]);

    expect(valores(lida.abas[0]!)).toEqual([["abcd"], ["soltoaquifim"], ["ação 😀👍 ✓"], ['linha 1\nlinha 2 & <tag> "aspas"']]);
  });

  it("palavras que são nomes internos do JavaScript não corrompem o arquivo", async () => {
    const palavras = ["constructor", "__proto__", "toString", "hasOwnProperty", "valueOf", "normal"];

    const lida = await gerar([...palavras, ...palavras].map((valor) => [celula.texto(valor)]));

    // O arquivo pode levar um caractere invisível, mas o que se lê é a palavra.
    expect(valores(lida.abas[0]!).map(([valor]) => String(valor).replace(/\u2060/g, ""))).toEqual([...palavras, ...palavras]);
  });

  it("texto com a forma _xHHHH_ aparece como foi digitado, e não como o caractere do código", async () => {
    const digitados = ["doc_x0041_.pdf", "_x0000_", "a_x0041_x0042_b", "_x005F_", "sem_x_nada"];

    const lida = await gerar(digitados.map((valor) => [celula.texto(valor)]));

    expect(valores(lida.abas[0]!).map(([valor]) => valor)).toEqual(digitados);
  });

  it("corta no limite de caracteres de uma célula do Excel", async () => {
    const lida = await gerar([[celula.texto("a".repeat(40_000))]]);

    expect(String(valores(lida.abas[0]!)[0]![0])).toHaveLength(32_767);
  });

  it("vazio ou ausente fica como célula vazia", async () => {
    const lida = await gerar([[celula.texto(null), celula.texto(""), celula.texto("x")]], 3);

    expect(valores(lida.abas[0]!)).toEqual([[null, null, "x"]]);
  });
});

describe("datas, dinheiro e números", () => {
  // Número de série do Excel: dias desde 30/12/1899. 26/11/2026 é o dia 46352.
  const DIA_26 = 46_352;

  it("data civil vira o dia certo, sem hora, exibida em dd/mm/aaaa", async () => {
    const lida = await gerar([[celula.data("2026-11-26")], [celula.data("2027-01-01")], [celula.data(null)]]);

    expect(lida.abas[0]!.linhas[1]![0]).toMatchObject({ tipo: "numero", valor: DIA_26, formato: "dd/mm/yyyy" });
    expect(lida.abas[0]!.linhas[2]![0]!.valor).toBe(46_388);
    expect(valores(lida.abas[0]!)[2]).toEqual([]);
  });

  it.each([
    ["um minuto antes da meia-noite em São Paulo", "2026-11-27T02:59:00Z", DIA_26 + (23 * 60 + 59) / 1440],
    ["meia-noite em São Paulo", "2026-11-26T03:00:00Z", DIA_26],
    ["meio da tarde", "2026-11-26T17:30:00Z", DIA_26 + 14.5 / 24],
  ])("instante sai no horário de São Paulo: %s", async (_caso, instante, esperado) => {
    const lida = await gerar([[celula.dataHora(new Date(instante))]]);

    const lido = lida.abas[0]!.linhas[1]![0]!;
    expect(lido).toMatchObject({ tipo: "numero", formato: "dd/mm/yyyy hh:mm" });
    expect(lido.valor).toBeCloseTo(esperado, 6);
  });

  it("só o dia de um instante também segue São Paulo", async () => {
    const lida = await gerar([[celula.diaDe(new Date("2026-11-27T02:59:00Z"))]]);

    expect(lida.abas[0]!.linhas[1]![0]).toMatchObject({ valor: DIA_26, formato: "dd/mm/yyyy" });
  });

  it("ano digitado errado, antes do que o Excel entende como data, sai como texto", async () => {
    const lida = await gerar([[celula.data("0202-11-26")], [celula.data("1900-02-28")], [celula.data("1900-03-01")]]);

    expect(valores(lida.abas[0]!)).toEqual([["26/11/0202"], ["28/02/1900"], [61]]);
  });

  it("dinheiro é número em reais, para somar", async () => {
    const lida = await gerar([[celula.dinheiro(123_456)], [celula.dinheiro(0)], [celula.dinheiro(1)]]);

    expect(valores(lida.abas[0]!)).toEqual([[1234.56], [0], [0.01]]);
    expect(lida.abas[0]!.linhas[1]![0]!.formato).toBe('"R$" #,##0.00');
  });

  it("inteiro é número", async () => {
    const lida = await gerar([[celula.inteiro(7)], [celula.inteiro(null)]]);

    expect(lida.abas[0]!.linhas[1]![0]).toMatchObject({ tipo: "numero", valor: 7 });
  });
});

describe("forma do arquivo", () => {
  it("tem as abas na ordem, cabeçalho em negrito e fixo e as larguras pedidas", async () => {
    const lida = lerPlanilha(await gerarPlanilha([aba([], 2), { ...aba([[celula.texto("a")]]), nome: "Leia-me" }]));

    expect(lida.abas.map((a) => a.nome)).toEqual(["Teste", "Leia-me"]);
    expect(lida.abas[0]!.linhas).toHaveLength(1); // lista vazia: só o cabeçalho
    expect(lida.abas[0]!.linhas[0]).toEqual([
      expect.objectContaining({ valor: "Coluna 1", negrito: true }), expect.objectContaining({ valor: "Coluna 2", negrito: true }),
    ]);
    expect(lida.abas[0]!.linhasFixas).toBe(1);
    expect(lida.abas[0]!.larguras).toEqual([20, 21]);
  });
});
