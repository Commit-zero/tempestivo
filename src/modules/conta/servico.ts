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
