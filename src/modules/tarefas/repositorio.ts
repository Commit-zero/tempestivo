import { getPrisma } from "@/platform/database";

// Todo método recebe `contaId` primeiro e filtra por ele.

export type Coluna = "a_fazer" | "fazendo" | "feito";

export type Tarefa = {
  id: string;
  titulo: string;
  descricao: string | null;
  coluna: Coluna;
  ordem: number;
  limite: string | null;
  processo: { id: string; assunto: string } | null;
};

const campos = {
  id: true, titulo: true, descricao: true, coluna: true, ordem: true, limite: true,
  processo: { select: { id: true, assunto: true } },
} as const;

export function listar(contaId: string): Promise<Tarefa[]> {
  return getPrisma().tarefa.findMany({ where: { contaId }, select: campos, orderBy: [{ ordem: "asc" }, { criadoEm: "asc" }] });
}

export function buscar(contaId: string, id: string): Promise<Tarefa | null> {
  return getPrisma().tarefa.findFirst({ where: { id, contaId }, select: campos });
}

/** Maior `ordem` da coluna, para a tarefa nova ou movida entrar no fim. */
export async function ultimaOrdem(contaId: string, coluna: Coluna): Promise<number> {
  const { _max } = await getPrisma().tarefa.aggregate({ where: { contaId, coluna }, _max: { ordem: true } });
  return _max.ordem ?? 0;
}

export function criar(
  contaId: string,
  dados: { titulo: string; descricao: string | null; limite: string | null; processoId: string | null; coluna: Coluna; ordem: number },
): Promise<Tarefa> {
  return getPrisma().tarefa.create({ data: { ...dados, contaId }, select: campos });
}

export async function mover(contaId: string, id: string, coluna: Coluna, ordem: number): Promise<boolean> {
  const { count } = await getPrisma().tarefa.updateMany({ where: { id, contaId }, data: { coluna, ordem } });
  return count === 1;
}

export async function excluir(contaId: string, id: string): Promise<boolean> {
  const { count } = await getPrisma().tarefa.deleteMany({ where: { id, contaId } });
  return count === 1;
}
