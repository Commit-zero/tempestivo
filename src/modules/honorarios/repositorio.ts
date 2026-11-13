import { getPrisma } from "@/platform/database";
import type { ParcelaPlanejada } from "./parcelas";

// Todo método recebe `contaId` primeiro e filtra por ele.

export type Parcela = { id: string; numero: number; valorCentavos: number; vencimento: string; pagaEm: Date | null };

export type Honorario = {
  id: string;
  descricao: string;
  criadoEm: Date;
  cliente: { id: string; nome: string; telefone: string | null };
  processo: { id: string; assunto: string } | null;
  parcelas: Parcela[];
};

const campos = {
  id: true, descricao: true, criadoEm: true,
  cliente: { select: { id: true, nome: true, telefone: true } },
  processo: { select: { id: true, assunto: true } },
  parcelas: { select: { id: true, numero: true, valorCentavos: true, vencimento: true, pagaEm: true }, orderBy: { numero: "asc" } },
} as const;

export function listar(contaId: string): Promise<Honorario[]> {
  return getPrisma().honorario.findMany({ where: { contaId }, select: campos, orderBy: { criadoEm: "desc" } });
}

export function buscar(contaId: string, id: string): Promise<Honorario | null> {
  return getPrisma().honorario.findFirst({ where: { id, contaId }, select: campos });
}

export function criar(
  contaId: string,
  dados: { clienteId: string; processoId: string | null; descricao: string },
  parcelas: ParcelaPlanejada[],
): Promise<Honorario> {
  return getPrisma().honorario.create({
    data: { ...dados, contaId, parcelas: { create: parcelas.map((parcela) => ({ ...parcela, contaId })) } },
    select: campos,
  });
}

/** Marca ou desmarca o pagamento. Devolve o id do honorário, ou `null` se a parcela não é da conta. */
export async function definirPagamento(contaId: string, parcelaId: string, pagaEm: Date | null): Promise<string | null> {
  const parcela = await getPrisma().parcela.findFirst({ where: { id: parcelaId, contaId }, select: { honorarioId: true } });
  if (!parcela) return null;
  await getPrisma().parcela.updateMany({ where: { id: parcelaId, contaId }, data: { pagaEm } });
  return parcela.honorarioId;
}

export async function excluir(contaId: string, id: string): Promise<boolean> {
  const { count } = await getPrisma().honorario.deleteMany({ where: { id, contaId } });
  return count === 1;
}

/** Parcelas em aberto e as pagas a partir de `pagasDesde`, para o resumo financeiro. */
export function listarParcelasDoResumo(contaId: string, pagasDesde: Date): Promise<Pick<Parcela, "valorCentavos" | "vencimento" | "pagaEm">[]> {
  return getPrisma().parcela.findMany({
    where: { contaId, OR: [{ pagaEm: null }, { pagaEm: { gte: pagasDesde } }] },
    select: { valorCentavos: true, vencimento: true, pagaEm: true },
  });
}
