import { getPrisma } from "@/platform/database";

/**
 * Apaga o que já venceu: sessões (guardam IP e navegador) e códigos temporários
 * (links de redefinição e passos pendentes do segundo fator). A biblioteca de login
 * não faz isso sozinha para quem não volta. Idempotente.
 */
export async function apagarRegistrosVencidos(agora = new Date()): Promise<{ sessoes: number; codigos: number }> {
  const vencidos = { expiresAt: { lt: agora } };
  const sessoes = await getPrisma().session.deleteMany({ where: vencidos });
  const codigos = await getPrisma().verification.deleteMany({ where: vencidos });
  return { sessoes: sessoes.count, codigos: codigos.count };
}
