import { headers } from "next/headers";
import { getLogger } from "@/platform/runtime";

// O que os casos de uso de autenticação têm em comum.

export const MUITAS_TENTATIVAS = "Muitas tentativas. Aguarde alguns minutos e tente de novo.";

export async function ipDoCliente(): Promise<string> {
  const cabecalhos = await headers();
  return cabecalhos.get("x-forwarded-for")?.split(",")[0]?.trim() || cabecalhos.get("x-real-ip") || "desconhecido";
}

/** Só a operação e o tipo do erro: nada de e-mail, senha ou código no log. */
export function registrarFalha(operacao: string, erro: unknown): void {
  getLogger().warn("falha de autenticação", {
    operacao,
    tipo: erro instanceof Error ? erro.name : typeof erro,
  });
}
