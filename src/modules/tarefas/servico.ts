import { z } from "zod";
import { ehDataCivil } from "@/lib/datas";
import { falha, primeiraMensagem, sucesso, type Resultado } from "@/lib/resultado";
import { textoOpcional } from "@/lib/validacao";
import { obterProcesso } from "@/modules/processos";
import * as repositorio from "./repositorio";
import type { Coluna, Tarefa } from "./repositorio";

export const COLUNAS: readonly { id: Coluna; titulo: string }[] = [
  { id: "a_fazer", titulo: "A fazer" },
  { id: "fazendo", titulo: "Fazendo" },
  { id: "feito", titulo: "Feito" },
];

const NAO_ENCONTRADA = "Tarefa não encontrada.";
const vazioParaNulo = z.string().transform((valor) => (valor === "" ? null : valor)).nullish().transform((valor) => valor ?? null);

const schemaTarefa = z.object({
  titulo: z.string().trim().min(2, "Escreva o que precisa ser feito.").max(160, "Use no máximo 160 caracteres no título."),
  descricao: textoOpcional(2000),
  limite: vazioParaNulo.refine((valor) => valor === null || ehDataCivil(valor), "Data limite inválida."),
  processoId: vazioParaNulo,
});

export type EntradaDeTarefa = Record<keyof z.input<typeof schemaTarefa>, unknown>;
export type Quadro = Record<Coluna, Tarefa[]>;

/** Tarefas da conta agrupadas pelas três colunas do quadro, na ordem de cada coluna. */
export async function obterQuadro(contaId: string): Promise<Quadro> {
  const quadro: Quadro = { a_fazer: [], fazendo: [], feito: [] };
  for (const tarefa of await repositorio.listar(contaId)) quadro[tarefa.coluna].push(tarefa);
  return quadro;
}

export async function criarTarefa(contaId: string, entrada: EntradaDeTarefa): Promise<Resultado<Tarefa>> {
  const validado = schemaTarefa.safeParse(entrada);
  if (!validado.success) return falha(primeiraMensagem(validado.error));
  // O processo precisa ser da mesma conta: o id vem do formulário.
  if (validado.data.processoId !== null && !(await obterProcesso(contaId, validado.data.processoId))) {
    return falha("Processo não encontrado.");
  }
  const ordem = (await repositorio.ultimaOrdem(contaId, "a_fazer")) + 1;
  return sucesso(await repositorio.criar(contaId, { ...validado.data, coluna: "a_fazer", ordem }));
}

/** Move a tarefa para o fim de outra coluna. */
export async function moverTarefa(contaId: string, id: string, coluna: unknown): Promise<Resultado> {
  const destino = COLUNAS.find((opcao) => opcao.id === coluna);
  if (!destino) return falha("Coluna desconhecida.");
  const tarefa = await repositorio.buscar(contaId, id);
  if (!tarefa) return falha(NAO_ENCONTRADA);
  if (tarefa.coluna === destino.id) return sucesso();
  await repositorio.mover(contaId, id, destino.id, (await repositorio.ultimaOrdem(contaId, destino.id)) + 1);
  return sucesso();
}

export async function excluirTarefa(contaId: string, id: string): Promise<Resultado> {
  return (await repositorio.excluir(contaId, id)) ? sucesso() : falha(NAO_ENCONTRADA);
}
