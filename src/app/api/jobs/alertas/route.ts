import { enviarAlertasPendentes } from "@/modules/alertas";
import { getConfig } from "@/platform/config";
import { getLogger, getMailer, getScheduler } from "@/platform/runtime";

export const dynamic = "force-dynamic";

// Job de alertas de prazo, chamado pelo agendador a cada 2 horas. Idempotente:
// cada aviso tem chave única, então repetir a chamada não duplica e-mail.
async function alertas(requisicao: Request) {
  const scheduler = getScheduler();
  if (!scheduler.autorizado(requisicao.headers)) {
    return Response.json({ erro: "não autorizado" }, { status: 401 });
  }
  try {
    const resumo = await scheduler.executar("alertas", () =>
      enviarAlertasPendentes({ mailer: getMailer(), logger: getLogger(), appUrl: getConfig().APP_URL }),
    );
    return Response.json({ ok: resumo.falhas === 0, ...resumo }, { status: resumo.falhas === 0 ? 200 : 502 });
  } catch {
    return Response.json({ ok: false }, { status: 500 });
  }
}

export { alertas as GET, alertas as POST };
