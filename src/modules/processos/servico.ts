import { z } from "zod";
import { falha, primeiraMensagem, sucesso, type Resultado } from "@/lib/resultado";
import { textoOpcional } from "@/lib/validacao";
import { obterCliente } from "@/modules/clientes";
import { numeroCnjValido, soDigitosDoNumero } from "./numero-cnj";
import * as repositorio from "./repositorio";
import type { FiltroDeProcessos, Processo, StatusProcesso } from "./repositorio";

const schemaProcesso = z.object({
  clienteId: z.string().min(1, "Escolha o cliente."),
  numero: z
    .string()
    .trim()
    .refine(numeroCnjValido, "Número do processo inválido. Use os 20 dígitos da numeração do CNJ.")
    .transform(soDigitosDoNumero),
  tribunal: z.string().trim().min(2, "Informe o tribunal.").max(20, "Use no máximo 20 caracteres no tribunal."),
  vara: textoOpcional(120),
  assunto: z.string().trim().min(2, "Informe o assunto do processo.").max(200, "Use no máximo 200 caracteres no assunto."),
  parteContraria: textoOpcional(160),
});

export type EntradaDeProcesso = Record<keyof z.input<typeof schemaProcesso>, unknown>;

const NAO_ENCONTRADO = "Processo não encontrado.";

async function validar(contaId: string, entrada: EntradaDeProcesso, ignorarId?: string) {
  const validado = schemaProcesso.safeParse(entrada);
  if (!validado.success) return falha(primeiraMensagem(validado.error));
  // O cliente precisa ser da mesma conta: o id vem do formulário e não é confiável.
  if (!(await obterCliente(contaId, validado.data.clienteId))) return falha("Cliente não encontrado.");
  if (await repositorio.numeroEmUso(contaId, validado.data.numero, ignorarId)) {
    return falha("Já existe um processo com este número.");
  }
  return sucesso(validado.data);
}

export function listarProcessos(contaId: string, filtro: FiltroDeProcessos = {}): Promise<Processo[]> {
  return repositorio.listar(contaId, { ...filtro, busca: filtro.busca?.trim() || undefined });
}

export function obterProcesso(contaId: string, id: string): Promise<Processo | null> {
  return repositorio.buscar(contaId, id);
}

export async function criarProcesso(contaId: string, entrada: EntradaDeProcesso): Promise<Resultado<Processo>> {
  const validado = await validar(contaId, entrada);
  if (!validado.ok) return validado;
  return sucesso(await repositorio.criar(contaId, validado.valor));
}

export async function atualizarProcesso(contaId: string, id: string, entrada: EntradaDeProcesso): Promise<Resultado> {
  const validado = await validar(contaId, entrada, id);
  if (!validado.ok) return validado;
  return (await repositorio.atualizar(contaId, id, validado.valor)) ? sucesso() : falha(NAO_ENCONTRADO);
}

export async function mudarStatusDoProcesso(contaId: string, id: string, status: StatusProcesso): Promise<Resultado> {
  if (status !== "ativo" && status !== "arquivado") return falha("Situação desconhecida.");
  return (await repositorio.atualizar(contaId, id, { status })) ? sucesso() : falha(NAO_ENCONTRADO);
}

/** Exclui o processo e, em cascata, os prazos e as audiências dele. */
export async function excluirProcesso(contaId: string, id: string): Promise<Resultado> {
  return (await repositorio.excluir(contaId, id)) ? sucesso() : falha(NAO_ENCONTRADO);
}
