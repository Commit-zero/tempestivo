import { exportarDadosDaConta } from "@/modules/conta";
import { obterSessao } from "@/platform/auth";

// Download de todos os dados da conta em JSON (portabilidade, LGPD art. 18, V).
export async function GET() {
  const sessao = await obterSessao();
  if (!sessao) return new Response(null, { status: 401 });
  const dados = await exportarDadosDaConta(sessao.contaId);
  return new Response(JSON.stringify(dados, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="tempestivo-dados-${dados.geradoEm.slice(0, 10)}.json"`,
      "Cache-Control": "private, no-store",
    },
  });
}
