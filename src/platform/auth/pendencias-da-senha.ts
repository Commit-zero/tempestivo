import { getPrisma } from "@/platform/database";
import type { Logger } from "@/platform/logger";

/**
 * Cancela o que ficou aberto com a senha antiga: os links de redefinição (um link
 * esquecido numa caixa de e-mail não pode trocar a senha de novo) e os passos
 * pendentes do segundo fator (de quem passou pela senha antiga e ainda não digitou o
 * código). Nunca lança: a senha já mudou.
 */
export async function invalidarPendenciasDaSenha(usuarioId: string, logger: Logger): Promise<void> {
  try {
    await getPrisma().verification.deleteMany({
      where: { value: usuarioId, OR: [{ identifier: { startsWith: "reset-password:" } }, { identifier: { startsWith: "2fa-" } }] },
    });
  } catch (erro) {
    logger.error("falha ao invalidar pendências da senha", { tipo: erro instanceof Error ? erro.name : typeof erro });
  }
}
