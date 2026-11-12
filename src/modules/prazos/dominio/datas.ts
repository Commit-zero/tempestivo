// Datas civis: 'AAAA-MM-DD', sem hora e sem fuso. Toda a aritmética usa UTC para
// que o fuso da máquina nunca desloque um dia. O fuso só aparece na exibição.
export type DataCivil = string;

const FORMATO = /^(\d{4})-(\d{2})-(\d{2})$/;
const MS_POR_DIA = 86_400_000;
const NOMES_DA_SEMANA = [
  "domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado",
] as const;

function paraMs(data: DataCivil): number {
  const partes = FORMATO.exec(data);
  if (!partes) throw new RangeError("data civil inválida");
  const [ano, mes, dia] = [Number(partes[1]), Number(partes[2]), Number(partes[3])];
  const ms = Date.UTC(ano, mes - 1, dia);
  const conferida = new Date(ms);
  // Rejeita datas que o calendário "corrige" sozinho, como 31/02.
  if (conferida.getUTCFullYear() !== ano || conferida.getUTCMonth() !== mes - 1 || conferida.getUTCDate() !== dia) {
    throw new RangeError("data civil inválida");
  }
  return ms;
}

function deMs(ms: number): DataCivil {
  return new Date(ms).toISOString().slice(0, 10);
}

export function ehDataCivil(valor: unknown): valor is DataCivil {
  if (typeof valor !== "string") return false;
  try {
    paraMs(valor);
    return true;
  } catch {
    return false;
  }
}

export function criarData(ano: number, mes: number, dia: number): DataCivil {
  const data = `${String(ano).padStart(4, "0")}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
  paraMs(data);
  return data;
}

export function somarDias(data: DataCivil, dias: number): DataCivil {
  return deMs(paraMs(data) + dias * MS_POR_DIA);
}

/** Dias corridos de `inicio` até `fim` (negativo se `fim` vier antes). */
export function diasEntre(inicio: DataCivil, fim: DataCivil): number {
  return Math.round((paraMs(fim) - paraMs(inicio)) / MS_POR_DIA);
}

/** 0 = domingo ... 6 = sábado. */
export function diaDaSemana(data: DataCivil): number {
  return new Date(paraMs(data)).getUTCDay();
}

export function nomeDoDiaDaSemana(data: DataCivil): string {
  return NOMES_DA_SEMANA[diaDaSemana(data)];
}

export function anoDe(data: DataCivil): number {
  return Number(data.slice(0, 4));
}

/** dd/mm/aaaa, o formato das telas. */
export function formatarData(data: DataCivil): string {
  paraMs(data);
  return `${data.slice(8, 10)}/${data.slice(5, 7)}/${data.slice(0, 4)}`;
}

/** Ex.: "25/11/2026 (quarta-feira)". */
export function formatarDataComSemana(data: DataCivil): string {
  return `${formatarData(data)} (${nomeDoDiaDaSemana(data)})`;
}

/** A data civil de um instante no fuso de São Paulo. Única ponte entre relógio e data civil. */
export function dataCivilEmSaoPaulo(instante: Date): DataCivil {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(instante);
  return partes;
}
