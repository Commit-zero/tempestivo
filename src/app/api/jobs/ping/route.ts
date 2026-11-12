import { bancoResponde } from "@/platform/health";
import { getScheduler } from "@/platform/runtime";

export const dynamic = "force-dynamic";

// Job de exemplo e de manutenção: confirma que o agendador chega ao app e mantém
// ativo o banco do plano gratuito. Idempotente: só faz uma leitura.
async function ping(requisicao: Request) {
  const scheduler = getScheduler();
  if (!scheduler.autorizado(requisicao.headers)) {
    return Response.json({ erro: "não autorizado" }, { status: 401 });
  }
  try {
    await scheduler.executar("ping", async () => {
      if (!(await bancoResponde())) throw new Error("banco não respondeu");
    });
    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false }, { status: 503 });
  }
}

export { ping as GET, ping as POST };
