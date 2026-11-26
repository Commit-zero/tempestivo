import { celula, type Aba } from "@/lib/planilha";
import { formatarNumeroCnj, listarProcessos } from "@/modules/processos";

/** Como a tela: sem filtro, ou com um valor desconhecido, só os ativos. */
function situacaoPedida(status: string | undefined) {
  if (status === "todos") return undefined;
  return status === "arquivado" ? "arquivado" : "ativo";
}

export async function abasDeProcessos(contaId: string, { busca, status }: { busca?: string; status?: string }): Promise<Aba[]> {
  const processos = await listarProcessos(contaId, { busca, status: situacaoPedida(status) });
  return [
    {
      nome: "Processos",
      colunas: [
        { titulo: "Número", largura: 28 }, { titulo: "Cliente", largura: 32 }, { titulo: "Assunto", largura: 40 },
        { titulo: "Tribunal", largura: 10 }, { titulo: "Vara", largura: 28 }, { titulo: "Parte contrária", largura: 28 },
        { titulo: "Situação", largura: 12 }, { titulo: "Cadastrado em", largura: 15 },
      ],
      linhas: processos.map((processo) => [
        celula.texto(formatarNumeroCnj(processo.numero)),
        celula.texto(processo.cliente.nome),
        celula.texto(processo.assunto),
        celula.texto(processo.tribunal),
        celula.texto(processo.vara),
        celula.texto(processo.parteContraria),
        celula.texto(processo.status === "ativo" ? "Ativo" : "Arquivado"),
        celula.diaDe(processo.criadoEm),
      ]),
    },
  ];
}
