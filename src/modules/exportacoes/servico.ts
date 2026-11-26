import { criarLimitador } from "@/lib/limitador";
import { dataCivilEmSaoPaulo } from "@/lib/datas";
import type { Aba } from "@/lib/planilha";
import { abasDeClientes } from "./clientes";
import { abasDeTarefas } from "./tarefas";
import { abasDeAudiencias } from "./audiencias";
import { abasDeHonorarios } from "./honorarios";
import { abasDePrazos } from "./prazos";
import { abasDeProcessos } from "./processos";

// O que fica de fora de toda planilha: identificadores internos, tokens, dados de acesso
// e o link de sala virtual (que costuma levar a senha). Cada coluna é escolhida à mão.

export const LISTAS = ["clientes", "processos", "prazos", "honorarios", "audiencias", "tarefas"] as const;
export type Lista = (typeof LISTAS)[number];

/** Os filtros que as telas das listas aceitam, como chegam no endereço. */
export type FiltrosDaPlanilha = { busca?: string; status?: string; filtro?: string };

export type PlanilhaMontada = { nomeDoArquivo: string; abas: Aba[] };

type Montador = (contaId: string, filtros: FiltrosDaPlanilha, agora: Date) => Promise<Aba[]>;

const MONTADORES: Record<Lista, Montador> = {
  clientes: abasDeClientes,
  tarefas: abasDeTarefas,
  audiencias: abasDeAudiencias,
  honorarios: abasDeHonorarios,
  prazos: abasDePrazos,
  processos: abasDeProcessos,
};

export function ehLista(valor: string): valor is Lista {
  return (LISTAS as readonly string[]).includes(valor);
}

export async function montarPlanilha(
  contaId: string, lista: Lista, filtros: FiltrosDaPlanilha = {}, agora = new Date(),
): Promise<PlanilhaMontada> {
  return {
    // Nunca leva nome, busca ou número: o arquivo fica na pasta de downloads.
    nomeDoArquivo: `tempestivo-${lista}-${dataCivilEmSaoPaulo(agora)}.xlsx`,
    abas: await MONTADORES[lista](contaId, filtros, agora),
  };
}

// Montar uma planilha lê a lista inteira: o limite protege o servidor e o banco.
const planilhasPorConta = criarLimitador({ maximo: 10, janelaMs: 60 * 1000 });

export function permitirPlanilha(contaId: string): boolean {
  return planilhasPorConta.permitir(contaId);
}
