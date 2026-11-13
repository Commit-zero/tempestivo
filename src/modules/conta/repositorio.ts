import { getPrisma } from "@/platform/database";

export type Conta = { id: string; nome: string; substitutoNome: string | null; substitutoEmail: string | null; criadoEm: Date };

const campos = { id: true, nome: true, substitutoNome: true, substitutoEmail: true, criadoEm: true } as const;

export function buscar(contaId: string): Promise<Conta | null> {
  return getPrisma().conta.findUnique({ where: { id: contaId }, select: campos });
}

export async function atualizar(contaId: string, dados: Pick<Conta, "nome" | "substitutoNome" | "substitutoEmail">): Promise<boolean> {
  const { count } = await getPrisma().conta.updateMany({ where: { id: contaId }, data: dados });
  return count === 1;
}
