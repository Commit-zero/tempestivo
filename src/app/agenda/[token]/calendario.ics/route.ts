import { criarLimitador } from "@/lib/limitador";
import { gerarFeedDaAgenda } from "@/modules/agenda";
import { getConfig } from "@/platform/config";

export const dynamic = "force-dynamic";

// O app de calendário baixa o feed algumas vezes por hora. Acima disso é abuso, que
// gastaria consultas ao banco e invocações do plano gratuito: limite por IP e por
// instância. O token tem 256 bits, então o limite não é o que impede adivinhar links.
const QUINZE_MINUTOS = 15 * 60 * 1000;
const requisicoes = criarLimitador({ maximo: 60, janelaMs: QUINZE_MINUTOS });

// Feed iCalendar assinado pelo aplicativo de calendário do advogado. Sem sessão de
// propósito: quem autoriza é o link secreto, que pode ser trocado na tela Conta.
export async function GET(requisicao: Request, { params }: RouteContext<"/agenda/[token]/calendario.ics">) {
  const ip = requisicao.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || requisicao.headers.get("x-real-ip") || "desconhecido";
  if (!requisicoes.permitir(ip)) {
    return new Response("Muitas requisições. Tente de novo em alguns minutos.", { status: 429, headers: { "Retry-After": "900" } });
  }
  const { token } = await params;
  const ics = await gerarFeedDaAgenda(token, getConfig().APP_URL);
  if (ics === null) return new Response("Agenda não encontrada.", { status: 404 });
  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="tempestivo.ics"',
      // Sem cópia em cache: trocar ou desligar o link vale na próxima requisição.
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex, nofollow",
      "Referrer-Policy": "no-referrer",
    },
  });
}
