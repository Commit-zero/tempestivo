import { z } from "zod";
import { falha, primeiraMensagem, sucesso, type Resultado } from "@/lib/resultado";
import { obterProcesso } from "@/modules/processos";
import { CATALOGO_BASE } from "./catalogo/tipos-de-prazo";
import {
  calcularPrazo, CONTAGENS, TIPOS_DE_EVENTO, type Contagem, type EntradaCalculo, type ResultadoCalculo,
} from "./dominio/calcular-prazo";
import { buscarTribunal, criarCalendario, type Ramo } from "./dominio/calendario";
import { dataCivilEmSaoPaulo, ehDataCivil, somarDias } from "@/lib/datas";
import { situacaoDoPrazo, type Situacao } from "./dominio/situacao";
import * as repositorio from "./repositorio";
import type {
  Alteracao, CanalConferencia, Conferencia, DadosDoPrazo, DiaCadastrado, MudancaDeCampo, Prazo,
} from "./repositorio";

const NAO_ENCONTRADO = "Prazo não encontrado.";

const dataCivil = (mensagem: string) => z.string().refine(ehDataCivil, mensagem);
const descricao = z.string().trim().min(2, "Descreva o prazo (por exemplo, o tipo do ato).").max(160, "Use no máximo 160 caracteres na descrição.");
const dias = z.coerce.number("Informe a quantidade de dias.").int("A quantidade de dias precisa ser um número inteiro.").min(1, "O prazo precisa ter pelo menos 1 dia.").max(365, "O prazo pode ter no máximo 365 dias.");

const schemaCalculo = z.object({
  dataEvento: dataCivil("Informe a data do evento."),
  tipoEvento: z.enum(TIPOS_DE_EVENTO as [string, ...string[]], "Escolha o tipo de evento."),
  dias,
  contagem: z.enum(CONTAGENS as [string, ...string[]], "Escolha o tipo de contagem."),
  emDobro: z.boolean(),
});

const schemaPrazo = z.discriminatedUnion("origem", [
  schemaCalculo.extend({ origem: z.literal("calculada"), processoId: z.string().min(1, "Escolha o processo."), descricao }),
  z.object({
    origem: z.literal("manual"),
    processoId: z.string().min(1, "Escolha o processo."),
    descricao,
    dataFinal: dataCivil("Informe a data final."),
  }),
]);

export type EntradaDeCalculo = Record<keyof z.input<typeof schemaCalculo>, unknown>;
export type EntradaDePrazo = { origem: unknown; processoId: unknown; descricao: unknown } & Partial<EntradaDeCalculo> & { dataFinal?: unknown };

export type PrazoComSituacao = Prazo & { situacao: Situacao };

function comSituacao(prazo: Prazo, agora: Date): PrazoComSituacao {
  return { ...prazo, situacao: situacaoDoPrazo(prazo, agora) };
}

// --- Cálculo -----------------------------------------------------------------

async function calcularParaProcesso(contaId: string, tribunal: string, entrada: z.output<typeof schemaCalculo>): Promise<ResultadoCalculo> {
  const diasSemExpediente = buscarTribunal(tribunal) ? await repositorio.listarDiasSemExpediente(contaId, tribunal) : [];
  return calcularPrazo(
    { ...entrada, tribunal } as EntradaCalculo,
    criarCalendario({ tribunal, diasSemExpediente }),
  );
}

/** Prévia do cálculo, sem gravar nada. A tela mostra os passos antes de o advogado salvar. */
export async function previsualizarPrazo(contaId: string, processoId: unknown, entrada: EntradaDeCalculo): Promise<ResultadoCalculo> {
  const validado = schemaCalculo.safeParse(entrada);
  if (!validado.success) return { ok: false, motivo: primeiraMensagem(validado.error) };
  const processo = typeof processoId === "string" ? await obterProcesso(contaId, processoId) : null;
  if (!processo) return { ok: false, motivo: "Escolha o processo." };
  return calcularParaProcesso(contaId, processo.tribunal, validado.data);
}

async function montarDados(contaId: string, entrada: EntradaDePrazo): Promise<Resultado<DadosDoPrazo>> {
  const validado = schemaPrazo.safeParse(entrada);
  if (!validado.success) return falha(primeiraMensagem(validado.error));
  const dados = validado.data;
  // O processo precisa ser da mesma conta: o id vem do formulário e não é confiável.
  const processo = await obterProcesso(contaId, dados.processoId);
  if (!processo) return falha("Processo não encontrado.");

  if (dados.origem === "manual") {
    return sucesso({
      processoId: processo.id, descricao: dados.descricao, dias: null, contagem: null, emDobro: false, tipoEvento: null,
      dataEvento: null, dataInicio: null, dataFinal: dados.dataFinal, origemDataFinal: "manual", memoriaDoCalculo: null,
    });
  }
  const calculo = await calcularParaProcesso(contaId, processo.tribunal, dados);
  if (!calculo.ok) return falha(calculo.motivo);
  return sucesso({
    processoId: processo.id,
    descricao: dados.descricao,
    dias: dados.dias,
    contagem: dados.contagem as Contagem,
    emDobro: dados.emDobro,
    tipoEvento: dados.tipoEvento as EntradaCalculo["tipoEvento"],
    dataEvento: dados.dataEvento,
    dataInicio: calculo.dataInicio,
    dataFinal: calculo.dataFinal,
    origemDataFinal: "calculada",
    memoriaDoCalculo: { passos: calculo.passos, avisos: calculo.avisos, regrasAplicadas: calculo.regrasAplicadas },
  });
}

// --- Prazos ------------------------------------------------------------------

/** Cadastra o prazo. Se a calculadora recusar, devolve o motivo para a tela pedir a data manual. */
export async function cadastrarPrazo(contaId: string, entrada: EntradaDePrazo): Promise<Resultado<Prazo>> {
  const dados = await montarDados(contaId, entrada);
  if (!dados.ok) return dados;
  return sucesso(await repositorio.criar(contaId, dados.valor));
}

export const FILTROS_DE_PRAZOS = ["em_aberto", "proximos_7_dias", "vencidos", "cumpridos"] as const;
export type FiltroDaLista = (typeof FILTROS_DE_PRAZOS)[number];

export async function listarPrazos(
  contaId: string, opcoes: { filtro?: FiltroDaLista; processoId?: string } = {}, agora = new Date(),
): Promise<PrazoComSituacao[]> {
  const hoje = dataCivilEmSaoPaulo(agora);
  const porFiltro = {
    em_aberto: { emAberto: true },
    proximos_7_dias: { emAberto: true, aPartirDe: hoje, ate: somarDias(hoje, 7) },
    vencidos: { emAberto: true, antesDe: hoje },
    cumpridos: { cumpridos: true },
  } satisfies Record<FiltroDaLista, repositorio.FiltroDePrazos>;
  const prazos = await repositorio.listar(contaId, { ...porFiltro[opcoes.filtro ?? "em_aberto"], processoId: opcoes.processoId });
  return prazos.map((prazo) => comSituacao(prazo, agora));
}

export type DetalheDoPrazo = PrazoComSituacao & { conferencias: Conferencia[]; historico: Alteracao[] };

export async function obterPrazo(contaId: string, id: string, agora = new Date()): Promise<DetalheDoPrazo | null> {
  const prazo = await repositorio.buscar(contaId, id);
  if (!prazo) return null;
  const [conferencias, historico] = await Promise.all([
    repositorio.listarConferencias(contaId, id), repositorio.listarHistorico(contaId, id),
  ]);
  return { ...comSituacao(prazo, agora), conferencias, historico };
}

/** "Li e conferi": registra data, hora e canal. `usuarioId` fica vazio quando vem do link do e-mail. */
export async function confirmarConferencia(
  contaId: string, prazoId: string, via: CanalConferencia, usuarioId: string | null = null, agora = new Date(),
): Promise<Resultado> {
  return (await repositorio.registrarConferencia(contaId, prazoId, via, agora, usuarioId)) ? sucesso() : falha(NAO_ENCONTRADO);
}

export async function marcarComoCumprido(contaId: string, id: string, agora = new Date()): Promise<Resultado> {
  const prazo = await repositorio.buscar(contaId, id);
  if (!prazo) return falha(NAO_ENCONTRADO);
  if (prazo.status === "cumprido") return sucesso();
  await repositorio.atualizarComHistorico(contaId, id, { status: "cumprido", cumpridoEm: agora }, [
    { campo: "status", valorAnterior: prazo.status, valorNovo: "cumprido" },
  ]);
  return sucesso();
}

/** Desfazer devolve o prazo para pendente e exige nova conferência. */
export async function desfazerCumprido(contaId: string, id: string): Promise<Resultado> {
  const prazo = await repositorio.buscar(contaId, id);
  if (!prazo) return falha(NAO_ENCONTRADO);
  if (prazo.status !== "cumprido") return sucesso();
  await repositorio.atualizarComHistorico(contaId, id, { status: "pendente", cumpridoEm: null, ultimaConferenciaEm: null }, [
    { campo: "status", valorAnterior: "cumprido", valorNovo: "pendente" },
  ]);
  return sucesso();
}

const CAMPOS_QUE_MUDAM_A_DATA = ["dataFinal", "origemDataFinal", "dias", "contagem", "emDobro", "tipoEvento", "dataEvento"] as const;
const texto = (valor: unknown) => (valor === null || valor === undefined ? null : String(valor));

/**
 * Edita o prazo. Mudança em qualquer dado que define a data final recalcula,
 * zera a conferência (o advogado precisa conferir de novo) e fica no histórico.
 * Mudar só a descrição não zera nada.
 */
export async function editarPrazo(contaId: string, id: string, entrada: EntradaDePrazo): Promise<Resultado<{ conferenciaZerada: boolean }>> {
  const atual = await repositorio.buscar(contaId, id);
  if (!atual) return falha(NAO_ENCONTRADO);
  const novo = await montarDados(contaId, { ...entrada, processoId: atual.processoId });
  if (!novo.ok) return novo;

  const mudancas: MudancaDeCampo[] = CAMPOS_QUE_MUDAM_A_DATA.filter((campo) => texto(atual[campo]) !== texto(novo.valor[campo])).map(
    (campo) => ({ campo, valorAnterior: texto(atual[campo]), valorNovo: texto(novo.valor[campo]) }),
  );
  const conferenciaZerada = mudancas.length > 0;
  if (atual.descricao !== novo.valor.descricao) {
    mudancas.push({ campo: "descricao", valorAnterior: atual.descricao, valorNovo: novo.valor.descricao });
  }
  await repositorio.atualizarComHistorico(
    contaId,
    id,
    {
      ...novo.valor,
      ...(conferenciaZerada
        ? { ultimaConferenciaEm: null, ...(atual.status === "confirmado" ? { status: "pendente" as const } : {}) }
        : {}),
    },
    mudancas,
  );
  return sucesso({ conferenciaZerada });
}

export async function excluirPrazo(contaId: string, id: string): Promise<Resultado> {
  return (await repositorio.excluir(contaId, id)) ? sucesso() : falha(NAO_ENCONTRADO);
}

// --- Dias sem expediente -----------------------------------------------------

const schemaDia = z.object({
  tribunal: z.string().refine((sigla) => buscarTribunal(sigla) !== undefined, "Escolha um tribunal atendido pela calculadora."),
  data: dataCivil("Informe a data."),
  motivo: z.string().trim().min(2, "Informe o motivo (por exemplo, o número da portaria).").max(120, "Use no máximo 120 caracteres no motivo."),
});

export function listarDiasSemExpediente(contaId: string): Promise<DiaCadastrado[]> {
  return repositorio.listarDiasSemExpediente(contaId);
}

/** Vale para os próximos cálculos. Prazos já cadastrados não são recalculados sozinhos. */
export async function cadastrarDiaSemExpediente(contaId: string, entrada: Record<keyof z.input<typeof schemaDia>, unknown>): Promise<Resultado> {
  const validado = schemaDia.safeParse(entrada);
  if (!validado.success) return falha(primeiraMensagem(validado.error));
  await repositorio.salvarDiaSemExpediente(contaId, validado.data.tribunal, validado.data.data, validado.data.motivo);
  return sucesso();
}

export async function excluirDiaSemExpediente(contaId: string, id: string): Promise<Resultado> {
  return (await repositorio.excluirDiaSemExpediente(contaId, id)) ? sucesso() : falha("Dia não encontrado.");
}

// --- Catálogo de tipos de prazo ----------------------------------------------

export type TipoDePrazo = {
  /** Chave do catálogo base ou id do tipo próprio. */
  id: string;
  nome: string;
  dias: number;
  contagem: Contagem;
  ramo: Ramo | null;
  referencia: string | null;
  origem: "catalogo" | "ajustado" | "proprio";
  /** Id do registro da conta (ajuste ou tipo próprio), usado para desfazer ou excluir. */
  registroId: string | null;
};

/** Catálogo base com os ajustes da conta aplicados, seguido dos tipos próprios. */
export async function listarTiposDePrazo(contaId: string): Promise<TipoDePrazo[]> {
  const daConta = await repositorio.listarTiposDaConta(contaId);
  const ajustes = new Map(daConta.filter((tipo) => tipo.chaveBase !== null).map((tipo) => [tipo.chaveBase, tipo]));
  const doCatalogo = CATALOGO_BASE.map((base): TipoDePrazo => {
    const ajuste = ajustes.get(base.chave);
    return {
      id: base.chave, nome: base.nome, ramo: base.ramo, referencia: base.referencia,
      dias: ajuste?.dias ?? base.dias,
      contagem: ajuste?.contagem ?? base.contagem,
      origem: ajuste ? "ajustado" : "catalogo",
      registroId: ajuste?.id ?? null,
    };
  });
  const proprios = daConta
    .filter((tipo) => tipo.chaveBase === null)
    .map((tipo): TipoDePrazo => ({ ...tipo, ramo: null, referencia: null, origem: "proprio", registroId: tipo.id }));
  return [...doCatalogo, ...proprios];
}

const schemaTipo = z.object({
  nome: z.string().trim().min(2, "Informe o nome do tipo de prazo.").max(120, "Use no máximo 120 caracteres no nome."),
  dias,
  contagem: z.enum(CONTAGENS as [string, ...string[]], "Escolha o tipo de contagem."),
});

/** Ajusta os dias de um tipo do catálogo só para esta conta. */
export async function ajustarTipoDoCatalogo(contaId: string, chave: unknown, entrada: { dias: unknown; contagem: unknown }): Promise<Resultado> {
  const base = CATALOGO_BASE.find((tipo) => tipo.chave === chave);
  if (!base) return falha("Tipo de prazo não encontrado.");
  const validado = schemaTipo.safeParse({ ...entrada, nome: base.nome });
  if (!validado.success) return falha(primeiraMensagem(validado.error));
  await repositorio.salvarAjusteDoCatalogo(contaId, base.chave, base.nome, validado.data.dias, validado.data.contagem as Contagem);
  return sucesso();
}

export async function criarTipoDePrazo(contaId: string, entrada: Record<keyof z.input<typeof schemaTipo>, unknown>): Promise<Resultado> {
  const validado = schemaTipo.safeParse(entrada);
  if (!validado.success) return falha(primeiraMensagem(validado.error));
  await repositorio.criarTipoProprio(contaId, validado.data.nome, validado.data.dias, validado.data.contagem as Contagem);
  return sucesso();
}

/** Exclui um tipo próprio ou desfaz o ajuste de um tipo do catálogo. */
export async function removerTipoDaConta(contaId: string, registroId: string): Promise<Resultado> {
  return (await repositorio.excluirTipoDaConta(contaId, registroId)) ? sucesso() : falha("Tipo de prazo não encontrado.");
}
