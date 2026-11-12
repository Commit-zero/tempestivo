import { getPrisma } from "@/platform/database";

// Consulta mínima para saber se o banco responde. Usada por /api/health e pelo
// job de ping, que também mantém ativo o banco do plano gratuito.
export async function bancoResponde(): Promise<boolean> {
  try {
    await getPrisma().$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}
