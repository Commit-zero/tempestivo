import type { Extrator } from "./extrator";

// Extrator local: lê a intimação com regras de texto, no próprio servidor. Não usa
// rede, não tem custo nem cota e nenhum dado sai do sistema, então pode receber
// texto real. É menos esperto que um modelo de linguagem: quando não acha um
// campo, deixa em branco e baixa a confiança, em vez de inventar.

const MESES: Record<string, string> = {
  janeiro: "01", fevereiro: "02", "março": "03", marco: "03", abril: "04", maio: "05", junho: "06", julho: "07",
  agosto: "08", setembro: "09", outubro: "10", novembro: "11", dezembro: "12",
};

const DATA = String.raw`(\d{1,2})[\/.](\d{1,2})[\/.](\d{4})|(\d{1,2})º?\s+de\s+([a-zç]+)\s+de\s+(\d{4})`;

function paraDataCivil(partes: (string | undefined)[]): string | null {
  const [dia, mes, ano, diaPorExtenso, nomeDoMes, anoPorExtenso] = partes;
  const montada = dia && mes && ano
    ? `${ano}-${mes.padStart(2, "0")}-${dia.padStart(2, "0")}`
    : diaPorExtenso && nomeDoMes && anoPorExtenso && MESES[nomeDoMes.toLowerCase()]
      ? `${anoPorExtenso}-${MESES[nomeDoMes.toLowerCase()]}-${diaPorExtenso.padStart(2, "0")}`
      : null;
  if (!montada) return null;
  const conferida = new Date(`${montada}T00:00:00Z`);
  return Number.isNaN(conferida.getTime()) || conferida.toISOString().slice(0, 10) !== montada ? null : montada;
}

/** Trecho ao redor do que foi encontrado, para o advogado ver de onde veio cada campo. */
function trecho(texto: string, inicio: number, tamanho: number): string {
  const de = Math.max(0, inicio - 40);
  const ate = Math.min(texto.length, inicio + tamanho + 40);
  return `${de > 0 ? "…" : ""}${texto.slice(de, ate).replace(/\s+/g, " ").trim()}${ate < texto.length ? "…" : ""}`;
}

// Do mais específico para o mais genérico: "embargos de declaração" antes de "manifestação".
const ATOS: readonly { padrao: RegExp; descricao: string }[] = [
  { padrao: /embargos\s+de\s+declara[çc][ãa]o/i, descricao: "Embargos de declaração" },
  { padrao: /contrarraz[õo]es/i, descricao: "Contrarrazões de recurso" },
  { padrao: /agravo\s+de\s+instrumento/i, descricao: "Agravo de instrumento" },
  { padrao: /agravo\s+de\s+peti[çc][ãa]o/i, descricao: "Agravo de petição" },
  { padrao: /recurso\s+de\s+revista/i, descricao: "Recurso de revista" },
  { padrao: /recurso\s+ordin[áa]rio/i, descricao: "Recurso ordinário" },
  { padrao: /apela[çc][ãa]o|apelar/i, descricao: "Apelação" },
  { padrao: /impugna[çc][ãa]o\s+ao\s+cumprimento/i, descricao: "Impugnação ao cumprimento" },
  { padrao: /cumprimento\s+de\s+senten[çc]a|pagar\s+o\s+d[ée]bito|pagamento\s+volunt[áa]rio/i, descricao: "Cumprimento de sentença: pagamento" },
  { padrao: /r[ée]plica|manifest[\w-]*[^.\n]{0,40}?sobre\s+a\s+contesta[çc][ãa]o/i, descricao: "Réplica" },
  { padrao: /contesta[çc][ãa]o|contestar|apresentar\s+defesa/i, descricao: "Contestação" },
  { padrao: /manifest(ar|e-se|a[çc][ãa]o)/i, descricao: "Manifestação" },
];

const EVENTOS: readonly { padrao: RegExp; tipo: string }[] = [
  { padrao: new RegExp(String.raw`disponibiliza\w*[^.\n]{0,60}?(?:${DATA})`, "i"), tipo: "disponibilizacao" },
  { padrao: new RegExp(String.raw`publica\w*[^.\n]{0,60}?(?:${DATA})`, "i"), tipo: "publicacao" },
  { padrao: new RegExp(String.raw`(?:ci[êe]ncia|ciente|intimad[oa]s?|intima[çc][ãa]o)[^.\n]{0,60}?(?:${DATA})`, "i"), tipo: "intimacao" },
];

export function criarExtratorLocal(): Extrator {
  return {
    async extrair(texto) {
      if (!texto.trim()) throw new Error("Texto da intimação vazio.");
      const evidencias: Record<string, string> = {};
      const rascunho: Record<string, unknown> = {};

      const numero = /\d{7}-?\d{2}\.?\d{4}\.?\d\.?\d{2}\.?\d{4}/.exec(texto);
      if (numero) {
        rascunho.numeroProcesso = numero[0].replace(/\D/g, "");
        evidencias.numeroProcesso = trecho(texto, numero.index, numero[0].length);
      }

      const prazo = /prazo\s+(?:legal\s+|comum\s+|sucessivo\s+|improrrog[áa]vel\s+)?de\s+(\d{1,3})\s*(?:\([^)]{1,30}\))?\s*dias(\s+[úu]teis|\s+corridos)?/i.exec(texto)
        ?? /\bem\s+(\d{1,3})\s*(?:\([^)]{1,30}\))?\s*dias(\s+[úu]teis|\s+corridos)?/i.exec(texto);
      if (prazo) {
        rascunho.dias = Number(prazo[1]);
        if (prazo[2]) rascunho.contagem = /corridos/i.test(prazo[2]) ? "corridos" : "uteis";
        evidencias.dias = trecho(texto, prazo.index, prazo[0].length);
      }

      for (const evento of EVENTOS) {
        const achado = evento.padrao.exec(texto);
        const data = achado ? paraDataCivil(achado.slice(1)) : null;
        if (achado && data) {
          rascunho.tipoEvento = evento.tipo;
          rascunho.dataEvento = data;
          evidencias.dataEvento = trecho(texto, achado.index, achado[0].length);
          break;
        }
      }
      if (!rascunho.dataEvento) {
        // Sem um verbo que diga o que a data é, a primeira data do texto vira só um palpite.
        const solta = new RegExp(DATA, "i").exec(texto);
        const data = solta ? paraDataCivil(solta.slice(1)) : null;
        if (solta && data) {
          rascunho.dataEvento = data;
          rascunho.dataIncerta = true;
          evidencias.dataEvento = trecho(texto, solta.index, solta[0].length);
        }
      }

      const ato = ATOS.map((opcao) => ({ opcao, achado: opcao.padrao.exec(texto) })).find((item) => item.achado);
      if (ato?.achado) {
        rascunho.descricao = ato.opcao.descricao;
        evidencias.descricao = trecho(texto, ato.achado.index, ato.achado[0].length);
      }

      if (/prazo\s+em\s+dobro|em\s+dobro\s+o\s+prazo/i.test(texto)) rascunho.emDobro = true;

      const completos = ["dias", "dataEvento", "tipoEvento"].filter((campo) => rascunho[campo] !== undefined).length;
      rascunho.confianca = completos === 3 && !rascunho.dataIncerta ? "alta" : completos >= 2 ? "media" : "baixa";
      rascunho.evidencias = evidencias;
      return rascunho;
    },
  };
}
