import { getPrisma } from "@/platform/database";

// Todo método recebe `contaId` primeiro e filtra por ele. Atualizar e excluir usam
// `updateMany`/`deleteMany` para que o filtro da conta faça parte da própria escrita.

export type DadosDoCliente = {
  nome: string;
  documento: string | null;
  email: string | null;
  telefone: string | null;
  observacoes: string | null;
};

export type Cliente = DadosDoCliente & { id: string; criadoEm: Date };
export type ClienteComContagem = Cliente & { processos: number };

const campos = {
  id: true, nome: true, documento: true, email: true, telefone: true, observacoes: true, criadoEm: true,
} as const;

export async function listar(contaId: string, busca?: string): Promise<ClienteComContagem[]> {
  const clientes = await getPrisma().cliente.findMany({
    where: { contaId, ...(busca ? { nome: { contains: busca, mode: "insensitive" } } : {}) },
    select: { ...campos, _count: { select: { processos: true } } },
    orderBy: { nome: "asc" },
  });
  return clientes.map(({ _count, ...cliente }) => ({ ...cliente, processos: _count.processos }));
}

export function buscar(contaId: string, id: string): Promise<Cliente | null> {
  return getPrisma().cliente.findFirst({ where: { id, contaId }, select: campos });
}

export function criar(contaId: string, dados: DadosDoCliente): Promise<Cliente> {
  return getPrisma().cliente.create({ data: { ...dados, contaId }, select: campos });
}

export async function atualizar(contaId: string, id: string, dados: DadosDoCliente): Promise<boolean> {
  const { count } = await getPrisma().cliente.updateMany({ where: { id, contaId }, data: dados });
  return count === 1;
}

export async function contarVinculos(contaId: string, id: string): Promise<number> {
  const prisma = getPrisma();
  const [processos, honorarios] = await Promise.all([
    prisma.processo.count({ where: { contaId, clienteId: id } }),
    prisma.honorario.count({ where: { contaId, clienteId: id } }),
  ]);
  return processos + honorarios;
}

export async function excluir(contaId: string, id: string): Promise<boolean> {
  const { count } = await getPrisma().cliente.deleteMany({ where: { id, contaId } });
  return count === 1;
}
