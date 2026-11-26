import { gerarPlanilha } from "@/lib/planilha";
import { ehLista, montarPlanilha, permitirPlanilha } from "@/modules/exportacoes";
import { obterSessao } from "@/platform/auth";
import { getLogger } from "@/platform/runtime";

// Download das planilhas. A conta vem só da sessão; o endereço escolhe apenas a lista e
// os filtros que a tela já tem. Nada é gravado no servidor nem guardado em cache.

const PRIVADO = { "Cache-Control": "private, no-store" };
const texto = (mensagem: string, status: number) =>
  new Response(mensagem, { status, headers: { ...PRIVADO, "Content-Type": "text/plain; charset=utf-8" } });

/** Só vale o parâmetro que veio uma vez: repetido, a tela também o ignora. */
function unico(parametros: URLSearchParams, nome: string): string | undefined {
  const valores = parametros.getAll(nome);
  return valores.length === 1 ? valores[0] : undefined;
}

// O Next responderia `HEAD` rodando o `GET`, que monta a planilha e gasta o limite.
export function HEAD() {
  return new Response(null, { status: 405, headers: { ...PRIVADO, Allow: "GET" } });
}

export async function GET(requisicao: Request, { params }: RouteContext<"/exportar/[lista]">) {
  // Outro site não pode fazer o navegador da pessoa baixar dados de clientes nem gastar o
  // limite dela. O cabeçalho é posto pelo navegador, e a página não consegue forjá-lo.
  if (requisicao.headers.get("sec-fetch-site") === "cross-site") return texto("Baixe a planilha pelo próprio Tempestivo.", 403);
  const sessao = await obterSessao();
  if (!sessao) return texto("Entre na sua conta de novo para baixar a planilha.", 401);
  const { lista } = await params;
  if (!ehLista(lista)) return texto("Planilha não encontrada.", 404);
  if (!permitirPlanilha(sessao.contaId)) return texto("Muitas planilhas em pouco tempo. Aguarde um minuto e tente de novo.", 429);

  const parametros = new URL(requisicao.url).searchParams;
  try {
    const planilha = await montarPlanilha(sessao.contaId, lista, {
      busca: unico(parametros, "busca"),
      status: unico(parametros, "status"),
      filtro: unico(parametros, "filtro"),
    });
    return new Response(new Uint8Array(await gerarPlanilha(planilha.abas)), {
      headers: {
        ...PRIVADO,
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${planilha.nomeDoArquivo}"`,
      },
    });
  } catch (erro) {
    // Só a lista e o tipo do erro: a busca pode ser um nome.
    getLogger().error("falha ao montar a planilha", { lista, tipo: erro instanceof Error ? erro.name : typeof erro });
    return texto("Não foi possível montar a planilha agora. Tente de novo.", 500);
  }
}
