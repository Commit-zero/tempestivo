import { getPrisma } from "@/platform/database";

export type StatusProcesso = "ativo" | "arquivado";

export type DadosDoProcesso = {
  clienteId: string;
  numero: string;
  tribunal: string;
  vara: string | null;
  assunto: string;
  parteContraria: string | null;
};

export type Processo = DadosDoProcesso & {
  id: string;
  status: StatusProcesso;
  criadoEm: Date;
  cliente: { id: string; nome: string };
};

export type FiltroDeProcessos = { status?: StatusProcesso; busca?: string; clienteId?: string };

const campos = {
  id: true, clienteId: true, numero: true, tribunal: true, vara: true, assunto: true, parteContraria: true,
  status: true, criadoEm: true, cliente: { select: { id: true, nome: true } },
} as const;

const PARECE_NUMERO = /^[\d.\-\s]*\d[\d.\-\s]*$/;

export function listar(contaId: string, { status, busca, clienteId }: FiltroDeProcessos = {}): Promise<Processo[]> {
  return getPrisma().processo.findMany({
    where: {
      contaId,
      ...(status ? { status } : {}),
      ...(clienteId ? { clienteId } : {}),
      ...(busca
        ? {
            OR: [
              // Só busca por número quando o termo é um número (com ou sem pontuação):
              // dígitos soltos dentro de um assunto não devem casar com números de processo.
              ...(PARECE_NUMERO.test(busca) ? [{ numero: { contains: busca.replace(/\D/g, "") } }] : []),
              { assunto: { contains: busca, mode: "insensitive" as const } },
              { cliente: { nome: { contains: busca, mode: "insensitive" as const } } },
            ],
          }
        : {}),
    },
    select: campos,
    orderBy: [{ status: "asc" }, { atualizadoEm: "desc" }],
  });
}

export function buscar(contaId: string, id: string): Promise<Processo | null> {
  return getPrisma().processo.findFirst({ where: { id, contaId }, select: campos });
}

export async function numeroEmUso(contaId: string, numero: string, ignorarId?: string): Promise<boolean> {
  const outro = await getPrisma().processo.findFirst({
    where: { contaId, numero, ...(ignorarId ? { NOT: { id: ignorarId } } : {}) },
    select: { id: true },
  });
  return outro !== null;
}

export function criar(contaId: string, dados: DadosDoProcesso): Promise<Processo> {
  return getPrisma().processo.create({ data: { ...dados, contaId }, select: campos });
}

export async function atualizar(contaId: string, id: string, dados: Partial<DadosDoProcesso> & { status?: StatusProcesso }): Promise<boolean> {
  const { count } = await getPrisma().processo.updateMany({ where: { id, contaId }, data: dados });
  return count === 1;
}

export async function excluir(contaId: string, id: string): Promise<boolean> {
  const { count } = await getPrisma().processo.deleteMany({ where: { id, contaId } });
  return count === 1;
}
