import { getPrisma } from "@/platform/database";
import type { Logger } from "@/platform/logger";

/**
 * Apaga os links de redefinição ainda abertos do usuário. Depois de trocar ou
 * redefinir a senha, um link antigo esquecido numa caixa de e-mail não pode servir
 * para trocá-la de novo. Nunca lança: a senha já mudou.
 */
export async function invalidarLinksDeRedefinicao(usuarioId: string, logger: Logger): Promise<void> {
  try {
    await getPrisma().verification.deleteMany({ where: { value: usuarioId, identifier: { startsWith: "reset-password:" } } });
  } catch (erro) {
    logger.error("falha ao invalidar links de redefinição", { tipo: erro instanceof Error ? erro.name : typeof erro });
  }
}
