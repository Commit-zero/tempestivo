import { headers } from "next/headers";
import { criarLimitador } from "@/lib/limitador";
import { getLogger } from "@/platform/runtime";

// O que os casos de uso de autenticação têm em comum.

export const MUITAS_TENTATIVAS = "Muitas tentativas. Aguarde alguns minutos e tente de novo.";

const tentativasDeEntrada = criarLimitador({ maximo: 5, janelaMs: 15 * 60 * 1000 });
const chaveDaEntrada = async (email: string) => `${await ipDoCliente()}:${email.toLowerCase()}`;

/** Conta uma tentativa de login por este endereço e e-mail. */
export async function permitirEntrada(email: string): Promise<boolean> {
  return tentativasDeEntrada.permitir(await chaveDaEntrada(email));
}

/**
 * Zera o contador, só depois de o login se completar. Com o segundo fator, a senha
 * sozinha não zera: senão, quem só a tem abriria passos pendentes à vontade.
 */
export async function liberarEntrada(email: string): Promise<void> {
  tentativasDeEntrada.liberar(await chaveDaEntrada(email));
}

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
