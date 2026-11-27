import { apagarRegistrosVencidos } from "@/platform/auth";
import { getScheduler } from "@/platform/runtime";

export const dynamic = "force-dynamic";

// Retenção (LGPD): apaga sessões e códigos vencidos. Chamado pelo agendador.
async function limpeza(requisicao: Request) {
  const scheduler = getScheduler();
  if (!scheduler.autorizado(requisicao.headers)) {
    return Response.json({ erro: "não autorizado" }, { status: 401 });
  }
  try {
    const resumo = await scheduler.executar("limpeza", () => apagarRegistrosVencidos());
    return Response.json({ ok: true, ...resumo });
  } catch {
    return Response.json({ ok: false }, { status: 500 });
  }
}

export { limpeza as GET, limpeza as POST };
