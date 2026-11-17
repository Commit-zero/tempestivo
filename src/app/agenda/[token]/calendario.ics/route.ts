import { gerarFeedDaAgenda } from "@/modules/agenda";
import { getConfig } from "@/platform/config";

export const dynamic = "force-dynamic";

// Feed iCalendar assinado pelo aplicativo de calendário do advogado. Sem sessão de
// propósito: quem autoriza é o link secreto, que pode ser trocado na tela Conta.
export async function GET(_requisicao: Request, { params }: RouteContext<"/agenda/[token]/calendario.ics">) {
  const { token } = await params;
  const ics = await gerarFeedDaAgenda(token, getConfig().APP_URL);
  if (ics === null) return new Response("Agenda não encontrada.", { status: 404 });
  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="tempestivo.ics"',
      "Cache-Control": "private, max-age=300",
      "X-Robots-Tag": "noindex, nofollow",
      "Referrer-Policy": "no-referrer",
    },
  });
}
