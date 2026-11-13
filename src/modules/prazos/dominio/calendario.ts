import { diaDaSemana, type DataCivil } from "@/lib/datas";
import { criarIndiceDeFeriados, feriadosEstaduaisSP, feriadosNacionais, pontosDependentesDoTribunal } from "./feriados";

const feriadoEm = criarIndiceDeFeriados((ano) => [...feriadosNacionais(ano), ...feriadosEstaduaisSP(ano)]);
const pontoDependenteEm = criarIndiceDeFeriados(pontosDependentesDoTribunal);

export type Ramo = "civel" | "trabalhista";
export type Tribunal = { sigla: string; nome: string; ramo: Ramo };

// Escopo do MVP: Justiça estadual de São Paulo e Justiça do Trabalho da 2ª Região.
export const TRIBUNAIS: readonly Tribunal[] = [
  { sigla: "TJSP", nome: "Tribunal de Justiça de São Paulo", ramo: "civel" },
  { sigla: "TRT-2", nome: "Tribunal Regional do Trabalho da 2ª Região", ramo: "trabalhista" },
];

export function buscarTribunal(sigla: string): Tribunal | undefined {
  return TRIBUNAIS.find((tribunal) => tribunal.sigla === sigla);
}

export type DiaSemExpediente = { data: DataCivil; motivo: string };

export interface Calendario {
  readonly tribunal: Tribunal;
  /** Motivo pelo qual não há expediente no dia, ou `null` se há. Não inclui o recesso. */
  motivoSemExpediente(data: DataCivil): string | null;
  /** Suspensão dos prazos de 20/12 a 20/01 (CPC art. 220; CLT art. 775-A). */
  emRecesso(data: DataCivil): boolean;
  /** Nome do ponto que depende de portaria do tribunal, se o dia for um e não estiver cadastrado. */
  pontoDependente(data: DataCivil): string | null;
}

export function emRecessoForense(data: DataCivil): boolean {
  const mes = Number(data.slice(5, 7));
  const dia = Number(data.slice(8, 10));
  return (mes === 12 && dia >= 20) || (mes === 1 && dia <= 20);
}

export type OpcoesCalendario = {
  tribunal: string;
  /** Dias sem expediente cadastrados pelo advogado (portarias, feriados municipais). */
  diasSemExpediente?: readonly DiaSemExpediente[];
};

/** Devolve `null` para tribunal fora do escopo: a calculadora recusa em vez de presumir. */
export function criarCalendario({ tribunal: sigla, diasSemExpediente = [] }: OpcoesCalendario): Calendario | null {
  const tribunal = buscarTribunal(sigla);
  if (!tribunal) return null;
  const cadastrados = new Map(diasSemExpediente.map((dia) => [dia.data, dia.motivo]));

  function motivoSemExpediente(data: DataCivil): string | null {
    const semana = diaDaSemana(data);
    if (semana === 6) return "sábado";
    if (semana === 0) return "domingo";
    const feriado = feriadoEm(data);
    if (feriado !== undefined) return `feriado: ${feriado}`;
    const cadastrado = cadastrados.get(data);
    return cadastrado === undefined ? null : `sem expediente: ${cadastrado}`;
  }

  return {
    tribunal,
    motivoSemExpediente,
    emRecesso: emRecessoForense,
    pontoDependente(data) {
      if (motivoSemExpediente(data) !== null || emRecessoForense(data)) return null;
      return pontoDependenteEm(data) ?? null;
    },
  };
}
