import { getPrisma, Prisma } from "@/platform/database";
import type { Contagem, TipoEvento } from "./dominio/calcular-prazo";
import type { DiaSemExpediente } from "./dominio/calendario";
import type { DataCivil } from "@/lib/datas";
import type { StatusPrazo } from "./dominio/situacao";

// Todo método recebe `contaId` primeiro e filtra por ele. As escritas usam
// `updateMany`/`deleteMany` para que o filtro da conta faça parte da própria escrita.

export type MemoriaDoCalculo = { passos: string[]; avisos: string[]; regrasAplicadas: string[] };
export type CanalConferencia = "app" | "email";

export type DadosDoPrazo = {
  processoId: string;
  descricao: string;
  dias: number | null;
  contagem: Contagem | null;
  emDobro: boolean;
  tipoEvento: TipoEvento | null;
  dataEvento: DataCivil | null;
  dataInicio: DataCivil | null;
  dataFinal: DataCivil;
  origemDataFinal: "calculada" | "manual";
  memoriaDoCalculo: MemoriaDoCalculo | null;
};

export type Prazo = DadosDoPrazo & {
  id: string;
  status: StatusPrazo;
  ultimaConferenciaEm: Date | null;
  cumpridoEm: Date | null;
  criadoEm: Date;
  processo: { id: string; numero: string; assunto: string; tribunal: string; cliente: { nome: string } };
};

export type Conferencia = { id: string; em: Date; via: CanalConferencia };
export type Alteracao = { id: string; em: Date; campo: string; valorAnterior: string | null; valorNovo: string | null };
export type MudancaDeCampo = { campo: string; valorAnterior: string | null; valorNovo: string | null };

const campos = {
  id: true, processoId: true, descricao: true, dias: true, contagem: true, emDobro: true, tipoEvento: true,
  dataEvento: true, dataInicio: true, dataFinal: true, origemDataFinal: true, memoriaDoCalculo: true, status: true,
  ultimaConferenciaEm: true, cumpridoEm: true, criadoEm: true,
  processo: { select: { id: true, numero: true, assunto: true, tribunal: true, cliente: { select: { nome: true } } } },
} as const;

type Linha = Prisma.PrazoGetPayload<{ select: typeof campos }>;

function paraPrazo(linha: Linha): Prazo {
  return { ...linha, memoriaDoCalculo: linha.memoriaDoCalculo as MemoriaDoCalculo | null };
}

function paraBanco(dados: Partial<DadosDoPrazo>) {
  const { memoriaDoCalculo, ...resto } = dados;
  if (memoriaDoCalculo === undefined) return resto;
  return { ...resto, memoriaDoCalculo: memoriaDoCalculo ?? Prisma.JsonNull };
}

export type FiltroDePrazos = {
  processoId?: string;
  /** Só prazos não cumpridos. */
  emAberto?: boolean;
  cumpridos?: boolean;
  /** Data final menor que esta data. */
  antesDe?: DataCivil;
  /** Data final até esta data, inclusive. */
  ate?: DataCivil;
  /** Data final a partir desta data, inclusive. */
  aPartirDe?: DataCivil;
};

export async function listar(contaId: string, filtro: FiltroDePrazos = {}): Promise<Prazo[]> {
  const dataFinal = {
    ...(filtro.antesDe ? { lt: filtro.antesDe } : {}),
    ...(filtro.ate ? { lte: filtro.ate } : {}),
    ...(filtro.aPartirDe ? { gte: filtro.aPartirDe } : {}),
  };
  const linhas = await getPrisma().prazo.findMany({
    where: {
      contaId,
      ...(filtro.processoId ? { processoId: filtro.processoId } : {}),
      ...(filtro.emAberto ? { status: { not: "cumprido" } } : {}),
      ...(filtro.cumpridos ? { status: "cumprido" } : {}),
      ...(Object.keys(dataFinal).length > 0 ? { dataFinal } : {}),
    },
    select: campos,
    orderBy: [{ dataFinal: filtro.cumpridos ? "desc" : "asc" }, { criadoEm: "asc" }],
  });
  return linhas.map(paraPrazo);
}

export async function buscar(contaId: string, id: string): Promise<Prazo | null> {
  const linha = await getPrisma().prazo.findFirst({ where: { id, contaId }, select: campos });
  return linha ? paraPrazo(linha) : null;
}

export async function criar(contaId: string, dados: DadosDoPrazo): Promise<Prazo> {
  const linha = await getPrisma().prazo.create({
    data: { ...dados, contaId, memoriaDoCalculo: dados.memoriaDoCalculo ?? Prisma.JsonNull },
    select: campos,
  });
  return paraPrazo(linha);
}

/** Atualiza o prazo e grava o histórico das mudanças na mesma transação. */
export async function atualizarComHistorico(
  contaId: string,
  id: string,
  dados: Partial<DadosDoPrazo> & { status?: StatusPrazo; ultimaConferenciaEm?: Date | null; cumpridoEm?: Date | null },
  mudancas: MudancaDeCampo[] = [],
): Promise<boolean> {
  return getPrisma().$transaction(async (transacao) => {
    const { count } = await transacao.prazo.updateMany({ where: { id, contaId }, data: paraBanco(dados) });
    if (count !== 1) return false;
    if (mudancas.length > 0) {
      await transacao.prazoHistorico.createMany({ data: mudancas.map((mudanca) => ({ ...mudanca, contaId, prazoId: id })) });
    }
    return true;
  });
}

/** Registra o "li e conferi" e atualiza o prazo na mesma transação. Prazo cumprido não muda de status. */
export async function registrarConferencia(
  contaId: string, prazoId: string, via: CanalConferencia, em: Date, usuarioId: string | null,
): Promise<boolean> {
  return getPrisma().$transaction(async (transacao) => {
    const prazo = await transacao.prazo.findFirst({ where: { id: prazoId, contaId }, select: { status: true } });
    if (!prazo) return false;
    await transacao.prazo.updateMany({
      where: { id: prazoId, contaId },
      data: { ultimaConferenciaEm: em, ...(prazo.status === "cumprido" ? {} : { status: "confirmado" as const }) },
    });
    await transacao.prazoConferencia.create({ data: { contaId, prazoId, via, em, usuarioId } });
    return true;
  });
}

export function listarConferencias(contaId: string, prazoId: string): Promise<Conferencia[]> {
  return getPrisma().prazoConferencia.findMany({
    where: { contaId, prazoId }, select: { id: true, em: true, via: true }, orderBy: { em: "desc" },
  });
}

export function listarHistorico(contaId: string, prazoId: string): Promise<Alteracao[]> {
  return getPrisma().prazoHistorico.findMany({
    where: { contaId, prazoId },
    select: { id: true, em: true, campo: true, valorAnterior: true, valorNovo: true },
    orderBy: [{ em: "desc" }, { id: "desc" }],
  });
}

export async function excluir(contaId: string, id: string): Promise<boolean> {
  const { count } = await getPrisma().prazo.deleteMany({ where: { id, contaId } });
  return count === 1;
}

// --- Dias sem expediente cadastrados pelo advogado ---------------------------

export type DiaCadastrado = DiaSemExpediente & { id: string; tribunal: string };

export function listarDiasSemExpediente(contaId: string, tribunal?: string): Promise<DiaCadastrado[]> {
  return getPrisma().diaSemExpediente.findMany({
    where: { contaId, ...(tribunal ? { tribunal } : {}) },
    select: { id: true, tribunal: true, data: true, motivo: true },
    orderBy: [{ data: "asc" }, { tribunal: "asc" }],
  });
}

/** Idempotente: cadastrar de novo o mesmo dia no mesmo tribunal só atualiza o motivo. */
export async function salvarDiaSemExpediente(contaId: string, tribunal: string, data: DataCivil, motivo: string): Promise<void> {
  await getPrisma().diaSemExpediente.upsert({
    where: { contaId_tribunal_data: { contaId, tribunal, data } },
    update: { motivo },
    create: { contaId, tribunal, data, motivo },
  });
}

export async function excluirDiaSemExpediente(contaId: string, id: string): Promise<boolean> {
  const { count } = await getPrisma().diaSemExpediente.deleteMany({ where: { id, contaId } });
  return count === 1;
}

// --- Tipos de prazo da conta (ajustes do catálogo e tipos próprios) -----------

export type TipoDaConta = { id: string; chaveBase: string | null; nome: string; dias: number; contagem: Contagem };

export function listarTiposDaConta(contaId: string): Promise<TipoDaConta[]> {
  return getPrisma().tipoDePrazo.findMany({
    where: { contaId },
    select: { id: true, chaveBase: true, nome: true, dias: true, contagem: true },
    orderBy: { nome: "asc" },
  });
}

export async function salvarAjusteDoCatalogo(contaId: string, chaveBase: string, nome: string, dias: number, contagem: Contagem): Promise<void> {
  await getPrisma().tipoDePrazo.upsert({
    where: { contaId_chaveBase: { contaId, chaveBase } },
    update: { dias, contagem },
    create: { contaId, chaveBase, nome, dias, contagem },
  });
}

export async function criarTipoProprio(contaId: string, nome: string, dias: number, contagem: Contagem): Promise<void> {
  await getPrisma().tipoDePrazo.create({ data: { contaId, chaveBase: null, nome, dias, contagem } });
}

/** Remove um tipo próprio ou desfaz o ajuste de um tipo do catálogo. */
export async function excluirTipoDaConta(contaId: string, id: string): Promise<boolean> {
  const { count } = await getPrisma().tipoDePrazo.deleteMany({ where: { id, contaId } });
  return count === 1;
}
