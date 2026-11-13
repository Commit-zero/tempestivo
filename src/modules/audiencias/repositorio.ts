import { getPrisma } from "@/platform/database";

// Todo método recebe `contaId` primeiro e filtra por ele.

export type DadosDaAudiencia = {
  processoId: string;
  tipo: string;
  inicio: Date;
  duracaoMin: number;
  local: string | null;
  linkVirtual: string | null;
  observacoes: string | null;
};

export type Audiencia = DadosDaAudiencia & {
  id: string;
  processo: { id: string; assunto: string; numero: string; cliente: { nome: string } };
};

const campos = {
  id: true, processoId: true, tipo: true, inicio: true, duracaoMin: true, local: true, linkVirtual: true, observacoes: true,
  processo: { select: { id: true, assunto: true, numero: true, cliente: { select: { nome: true } } } },
} as const;

export function listar(contaId: string, filtro: { aPartirDe?: Date; antesDe?: Date; processoId?: string } = {}): Promise<Audiencia[]> {
  return getPrisma().audiencia.findMany({
    where: {
      contaId,
      ...(filtro.processoId ? { processoId: filtro.processoId } : {}),
      ...(filtro.aPartirDe || filtro.antesDe
        ? { inicio: { ...(filtro.aPartirDe ? { gte: filtro.aPartirDe } : {}), ...(filtro.antesDe ? { lt: filtro.antesDe } : {}) } }
        : {}),
    },
    select: campos,
    orderBy: { inicio: filtro.antesDe && !filtro.aPartirDe ? "desc" : "asc" },
  });
}

export function buscar(contaId: string, id: string): Promise<Audiencia | null> {
  return getPrisma().audiencia.findFirst({ where: { id, contaId }, select: campos });
}

export function criar(contaId: string, dados: DadosDaAudiencia): Promise<Audiencia> {
  return getPrisma().audiencia.create({ data: { ...dados, contaId }, select: campos });
}

export async function atualizar(contaId: string, id: string, dados: DadosDaAudiencia): Promise<boolean> {
  const { count } = await getPrisma().audiencia.updateMany({ where: { id, contaId }, data: dados });
  return count === 1;
}

export async function excluir(contaId: string, id: string): Promise<boolean> {
  const { count } = await getPrisma().audiencia.deleteMany({ where: { id, contaId } });
  return count === 1;
}
