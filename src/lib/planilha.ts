import escreverXlsx from "write-excel-file/node";
import type { DataCivil } from "@/lib/datas";

// O único ponto que usa a biblioteca de planilhas. Garante, e `planilha.test.ts` prova:
// texto digitado nunca vira fórmula, datas e horários são os de São Paulo (seja qual for
// o fuso do computador) e dinheiro é número.

const FORMATO_DO_DIA = "dd/mm/yyyy";
const FORMATO_DO_INSTANTE = "dd/mm/yyyy hh:mm";
const FORMATO_EM_REAIS = '"R$" #,##0.00';
const LIMITE_DE_TEXTO = 32_767; // limite de uma célula no Excel

type CelulaGravada = { value: string | number | Date; type: StringConstructor | NumberConstructor | DateConstructor; format?: string; fontWeight?: "bold" } | null;

export type Celula = CelulaGravada;
export type Coluna = { titulo: string; largura: number };
/** `nome`: até 31 caracteres, sem [ ] / \ : * ?. */
export type Aba = { nome: string; colunas: Coluna[]; linhas: Celula[][] };

function limparTexto(valor: string): string {
  // `toWellFormed` troca metades soltas de emoji por U+FFFD antes de a biblioteca agir
  // (a limpeza dela apagaria também o caractere anterior).
  const limpo = valor
    .toWellFormed()
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u0084\u0086-\u009F\uFFFD\uFFFE\uFFFF]/g, "")
    .slice(0, LIMITE_DE_TEXTO)
    .toWellFormed()
    .replace(/\uFFFD/g, "");
  // A biblioteca indexa os textos num objeto comum: "constructor" ou "__proto__"
  // acertariam uma propriedade herdada e corromperiam o arquivo. Um caractere invisível
  // (U+2060) tira o texto do caminho sem mudar o que se lê.
  return limpo in Object.prototype ? `${limpo}\u2060` : limpo;
}

const partesEmSaoPaulo = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
  second: "2-digit", hourCycle: "h23",
});

/** O relógio de São Paulo escrito como se fosse UTC: é a partir dele que a biblioteca conta os dias. */
function relogioDeSaoPaulo(instante: Date): Date {
  const parte = Object.fromEntries(partesEmSaoPaulo.formatToParts(instante).map((p) => [p.type, Number(p.value)]));
  return new Date(Date.UTC(parte.year!, parte.month! - 1, parte.day!, parte.hour!, parte.minute!, parte.second!));
}

const dia = (valor: Date): Celula => ({ value: valor, type: Date, format: FORMATO_DO_DIA });

export const celula = {
  texto(valor: string | null | undefined): Celula {
    const limpo = valor ? limparTexto(valor) : "";
    return limpo ? { value: limpo, type: String } : null;
  },
  /** Data civil 'AAAA-MM-DD' (vencimento, data do prazo). */
  data(valor: DataCivil | null | undefined): Celula {
    return valor ? dia(new Date(`${valor}T00:00:00Z`)) : null;
  },
  /** Instante com a hora, no horário de São Paulo. */
  dataHora(valor: Date | null | undefined): Celula {
    return valor ? { value: relogioDeSaoPaulo(valor), type: Date, format: FORMATO_DO_INSTANTE } : null;
  },
  /** Só o dia, em São Paulo, em que o instante aconteceu. */
  diaDe(valor: Date | null | undefined): Celula {
    if (!valor) return null;
    const relogio = relogioDeSaoPaulo(valor);
    relogio.setUTCHours(0, 0, 0, 0);
    return dia(relogio);
  },
  dinheiro(centavos: number): Celula {
    return { value: centavos / 100, type: Number, format: FORMATO_EM_REAIS };
  },
  inteiro(valor: number | null | undefined): Celula {
    return valor === null || valor === undefined ? null : { value: valor, type: Number };
  },
};

export async function gerarPlanilha(abas: Aba[]): Promise<Buffer> {
  return escreverXlsx(
    abas.map(({ nome, colunas, linhas }) => ({
      sheet: nome,
      columns: colunas.map(({ largura }) => ({ width: largura })),
      stickyRowsCount: 1,
      data: [colunas.map(({ titulo }) => ({ ...celula.texto(titulo)!, fontWeight: "bold" as const })), ...linhas],
    })),
  ).toBuffer();
}
