import { exportarAudienciaParaAgenda } from "@/modules/audiencias";
import { obterSessao } from "@/platform/auth";

// Arquivo .ics da audiência, só para a conta dona dela.
export async function GET(_requisicao: Request, { params }: RouteContext<"/audiencias/[id]/agenda.ics">) {
  const sessao = await obterSessao();
  if (!sessao) return new Response(null, { status: 401 });
  const { id } = await params;
  const ics = await exportarAudienciaParaAgenda(sessao.contaId, id);
  if (ics === null) return new Response(null, { status: 404 });
  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="audiencia.ics"',
      "Cache-Control": "private, no-store",
    },
  });
}
