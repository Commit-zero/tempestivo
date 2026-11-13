import { z } from "zod";
import { dataCivilEmSaoPaulo, ehDataCivil } from "@/lib/datas";
import { lerReais } from "@/lib/dinheiro";
import { falha, primeiraMensagem, sucesso, type Resultado } from "@/lib/resultado";
import { obterCliente } from "@/modules/clientes";
import { obterProcesso } from "@/modules/processos";
import { dividirEmParcelas, situacaoDaParcela, type SituacaoDaParcela } from "./parcelas";
import * as repositorio from "./repositorio";
import type { Honorario, Parcela } from "./repositorio";

const MAXIMO_DE_PARCELAS = 60;

const schemaHonorario = z.object({
  clienteId: z.string().min(1, "Escolha o cliente."),
  processoId: z.string().transform((valor) => (valor === "" ? null : valor)).nullish().transform((valor) => valor ?? null),
  descricao: z.string().trim().min(2, "Descreva o honorário (por exemplo, o serviço contratado).").max(160, "Use no máximo 160 caracteres na descrição."),
  valorTotal: z.string().transform((texto, contexto) => {
    const centavos = lerReais(texto);
    if (centavos === null) {
      contexto.addIssue({ code: "custom", message: "Informe o valor total, por exemplo 1.500,00." });
      return z.NEVER;
    }
    return centavos;
  }),
  parcelas: z.coerce.number("Informe a quantidade de parcelas.").int("A quantidade de parcelas precisa ser um número inteiro.").min(1, "É preciso pelo menos 1 parcela.").max(MAXIMO_DE_PARCELAS, `Use no máximo ${MAXIMO_DE_PARCELAS} parcelas.`),
  primeiroVencimento: z.string().refine(ehDataCivil, "Informe a data do primeiro vencimento."),
});

export type EntradaDeHonorario = Record<keyof z.input<typeof schemaHonorario>, unknown>;

export type ParcelaComSituacao = Parcela & { situacao: SituacaoDaParcela };
export type HonorarioComSituacao = Omit<Honorario, "parcelas"> & {
  parcelas: ParcelaComSituacao[];
  totalCentavos: number;
  recebidoCentavos: number;
  emAtrasoCentavos: number;
};

function comSituacao(honorario: Honorario, agora: Date): HonorarioComSituacao {
  const hoje = dataCivilEmSaoPaulo(agora);
  const parcelas = honorario.parcelas.map((parcela) => ({ ...parcela, situacao: situacaoDaParcela(parcela, hoje) }));
  const somar = (lista: ParcelaComSituacao[]) => lista.reduce((total, parcela) => total + parcela.valorCentavos, 0);
  return {
    ...honorario,
    parcelas,
    totalCentavos: somar(parcelas),
    recebidoCentavos: somar(parcelas.filter((parcela) => parcela.situacao === "paga")),
    emAtrasoCentavos: somar(parcelas.filter((parcela) => parcela.situacao === "em_atraso")),
  };
}

export async function criarHonorario(contaId: string, entrada: EntradaDeHonorario): Promise<Resultado<Honorario>> {
  const validado = schemaHonorario.safeParse(entrada);
  if (!validado.success) return falha(primeiraMensagem(validado.error));
  const { clienteId, processoId, descricao, valorTotal, parcelas, primeiroVencimento } = validado.data;
  if (valorTotal < parcelas) return falha("O valor total é pequeno demais para essa quantidade de parcelas.");
  // Cliente e processo precisam ser da mesma conta: os ids vêm do formulário.
  if (!(await obterCliente(contaId, clienteId))) return falha("Cliente não encontrado.");
  if (processoId !== null) {
    const processo = await obterProcesso(contaId, processoId);
    if (!processo) return falha("Processo não encontrado.");
    if (processo.clienteId !== clienteId) return falha("O processo escolhido é de outro cliente.");
  }
  return sucesso(
    await repositorio.criar(contaId, { clienteId, processoId, descricao }, dividirEmParcelas(valorTotal, parcelas, primeiroVencimento)),
  );
}

export async function listarHonorarios(contaId: string, agora = new Date()): Promise<HonorarioComSituacao[]> {
  return (await repositorio.listar(contaId)).map((honorario) => comSituacao(honorario, agora));
}

export async function obterHonorario(contaId: string, id: string, agora = new Date()): Promise<HonorarioComSituacao | null> {
  const honorario = await repositorio.buscar(contaId, id);
  return honorario ? comSituacao(honorario, agora) : null;
}

/** Marca a parcela como paga ou desfaz. Devolve o id do honorário para a tela atualizar. */
export async function definirPagamentoDaParcela(contaId: string, parcelaId: string, paga: boolean, agora = new Date()): Promise<Resultado<string>> {
  const honorarioId = await repositorio.definirPagamento(contaId, parcelaId, paga ? agora : null);
  return honorarioId ? sucesso(honorarioId) : falha("Parcela não encontrada.");
}

export async function excluirHonorario(contaId: string, id: string): Promise<Resultado> {
  return (await repositorio.excluir(contaId, id)) ? sucesso() : falha("Honorário não encontrado.");
}

export type ResumoFinanceiro = { aReceberCentavos: number; emAtrasoCentavos: number; recebidoNoMesCentavos: number; parcelasEmAtraso: number };

/** Visão do mês: o que falta receber, o que está em atraso e o que já entrou neste mês. */
export async function resumoFinanceiro(contaId: string, agora = new Date()): Promise<ResumoFinanceiro> {
  const hoje = dataCivilEmSaoPaulo(agora);
  // Meia-noite do dia 1 em São Paulo (UTC-3, sem horário de verão).
  const inicioDoMes = new Date(`${hoje.slice(0, 7)}-01T03:00:00Z`);
  const parcelas = await repositorio.listarParcelasDoResumo(contaId, inicioDoMes);
  const resumo: ResumoFinanceiro = { aReceberCentavos: 0, emAtrasoCentavos: 0, recebidoNoMesCentavos: 0, parcelasEmAtraso: 0 };
  for (const parcela of parcelas) {
    if (parcela.pagaEm) {
      resumo.recebidoNoMesCentavos += parcela.valorCentavos;
      continue;
    }
    resumo.aReceberCentavos += parcela.valorCentavos;
    if (parcela.vencimento < hoje) {
      resumo.emAtrasoCentavos += parcela.valorCentavos;
      resumo.parcelasEmAtraso += 1;
    }
  }
  return resumo;
}
