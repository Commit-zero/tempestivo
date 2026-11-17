import { z } from "zod";
import { falha, primeiraMensagem, sucesso, type Resultado } from "@/lib/resultado";
import { textoOpcional } from "@/lib/validacao";
import * as repositorio from "./repositorio";
import type { Conta } from "./repositorio";

const schemaConta = z
  .object({
    nome: z.string().trim().min(2, "Informe o nome da conta.").max(120, "Use no máximo 120 caracteres no nome."),
    substitutoNome: textoOpcional(120),
    substitutoEmail: textoOpcional(254).refine((valor) => valor === null || z.email().safeParse(valor).success, "E-mail do substituto inválido."),
  })
  .refine((conta) => conta.substitutoNome === null || conta.substitutoEmail !== null, "Informe o e-mail do substituto.");

export function obterConta(contaId: string): Promise<Conta | null> {
  return repositorio.buscar(contaId);
}

/**
 * Dados da conta e do substituto: o colega que recebe um e-mail quando um prazo
 * chega à véspera sem conferência. Ele não ganha acesso ao sistema.
 */
export async function atualizarConta(contaId: string, entrada: Record<"nome" | "substitutoNome" | "substitutoEmail", unknown>): Promise<Resultado> {
  const validado = schemaConta.safeParse(entrada);
  if (!validado.success) return falha(primeiraMensagem(validado.error));
  return (await repositorio.atualizar(contaId, validado.data)) ? sucesso() : falha("Conta não encontrada.");
}

export type ExportacaoDaConta = { geradoEm: string; formato: "tempestivo-exportacao-v1" } & Awaited<ReturnType<typeof repositorio.exportar>>;

/** Todos os dados da conta em um objeto só, pronto para virar um arquivo JSON. */
export async function exportarDadosDaConta(contaId: string, agora = new Date()): Promise<ExportacaoDaConta> {
  return { formato: "tempestivo-exportacao-v1", geradoEm: agora.toISOString(), ...(await repositorio.exportar(contaId)) };
}

/**
 * Exclusão definitiva da conta e de todos os dados (LGPD art. 18, VI). Quem chama
 * confirma antes a senha atual do titular: esta função não tem volta.
 */
export async function excluirConta(sessao: { contaId: string; usuarioId: string }): Promise<Resultado> {
  return (await repositorio.excluirTudo(sessao.contaId, sessao.usuarioId)) ? sucesso() : falha("Conta não encontrada.");
}
