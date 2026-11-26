import { strFromU8, unzipSync } from "fflate";

// Abre um .xlsx nos testes e devolve o que de fato foi gravado em cada célula: o tipo
// no arquivo, o valor, o formato de exibição e se há fórmula. Lê o XML direto, sem
// confiar na biblioteca que o escreveu.

export type CelulaLida = { tipo: "texto" | "numero" | "vazia"; valor: string | number | null; formato: string; negrito: boolean };
export type AbaLida = { nome: string; linhas: CelulaLida[][]; larguras: number[]; linhasFixas: number };
export type PlanilhaLida = { abas: AbaLida[]; arquivos: Record<string, string>; temFormula: boolean };

const semEntidades = (texto: string) =>
  texto.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");
const atributo = (marca: string, nome: string) => new RegExp(`\\b${nome}="([^"]*)"`).exec(marca)?.[1];
const trecho = (xml: string, nome: string) => new RegExp(`<${nome}\\b[^>]*>([\\s\\S]*?)</${nome}>`).exec(xml)?.[1] ?? "";
const elementos = (xml: string, nome: string) =>
  [...xml.matchAll(new RegExp(`<${nome}\\b([^>]*?)(?:/>|>([\\s\\S]*?)</${nome}>)`, "g"))].map((m) => ({ atributos: m[1]!, corpo: m[2] ?? "" }));

function coluna(referencia: string): number {
  return [...referencia.replace(/\d/g, "")].reduce((total, letra) => total * 26 + letra.charCodeAt(0) - 64, 0) - 1;
}

export function lerPlanilha(conteudo: Uint8Array): PlanilhaLida {
  const arquivos = Object.fromEntries(Object.entries(unzipSync(conteudo)).map(([nome, bytes]) => [nome, strFromU8(bytes)]));
  const textos = elementos(arquivos["xl/sharedStrings.xml"] ?? "", "si").map((si) => semEntidades(trecho(si.corpo, "t")));
  const estilos = arquivos["xl/styles.xml"] ?? "";
  const codigos = new Map(
    elementos(trecho(estilos, "numFmts"), "numFmt").map((f) => [atributo(f.atributos, "numFmtId")!, semEntidades(atributo(f.atributos, "formatCode")!)]),
  );
  const fontes = elementos(trecho(estilos, "fonts"), "font").map((f) => /<b\s*\/?>/.test(f.corpo));
  const xfs = elementos(trecho(estilos, "cellXfs"), "xf").map((xf) => ({
    formato: codigos.get(atributo(xf.atributos, "numFmtId") ?? "0") ?? "",
    negrito: fontes[Number(atributo(xf.atributos, "fontId") ?? 0)] ?? false,
  }));

  const nomes = elementos(trecho(arquivos["xl/workbook.xml"]!, "sheets"), "sheet").map((s) => semEntidades(atributo(s.atributos, "name")!));
  const abas = nomes.map((nome, indice) => {
    const xml = arquivos[`xl/worksheets/sheet${indice + 1}.xml`]!;
    const linhas = elementos(trecho(xml, "sheetData"), "row").map((linha) => {
      const celulas: CelulaLida[] = [];
      for (const c of elementos(linha.corpo, "c")) {
        const estilo = xfs[Number(atributo(c.atributos, "s") ?? 0)] ?? { formato: "", negrito: false };
        const bruto = /<v>([\s\S]*?)<\/v>/.exec(c.corpo)?.[1];
        const ehTexto = atributo(c.atributos, "t") === "s";
        const posicao = coluna(atributo(c.atributos, "r")!);
        while (celulas.length < posicao) celulas.push({ tipo: "vazia", valor: null, formato: "", negrito: false });
        celulas[posicao] =
          bruto === undefined
            ? { tipo: "vazia", valor: null, ...estilo }
            : ehTexto
              ? { tipo: "texto", valor: textos[Number(bruto)] ?? `índice inválido: ${bruto}`, ...estilo }
              : { tipo: "numero", valor: Number(bruto), ...estilo };
      }
      return celulas;
    });
    return {
      nome,
      linhas,
      larguras: elementos(trecho(xml, "cols"), "col").map((c) => Number(atributo(c.atributos, "width"))),
      linhasFixas: Number(atributo(/<pane\b[^>]*>/.exec(xml)?.[0] ?? "", "ySplit") ?? 0),
    };
  });
  const temFormula = Object.entries(arquivos).some(([nome, xml]) => nome.includes("worksheets/") && /<f[\s>/]/.test(xml));
  return { abas, arquivos, temFormula };
}

/** Os valores de uma aba, linha a linha, sem o cabeçalho. */
export const valores = (aba: AbaLida) => aba.linhas.slice(1).map((linha) => linha.map((celula) => celula.valor));
