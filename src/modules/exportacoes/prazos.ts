import { formatarData, dataCivilEmSaoPaulo } from "@/lib/datas";
import { celula, type Aba } from "@/lib/planilha";
import { AVISO_CALCULO_AUXILIAR, AVISO_REGRAS_PENDENTES, FILTROS_DE_PRAZOS, listarPrazos, listarRegras } from "@/modules/prazos";
import { formatarNumeroCnj } from "@/modules/processos";

/** O aviso vai no próprio título: continua junto quando alguém copia só a tabela. */
export const TITULO_DA_DATA_FINAL = "Data final (cálculo auxiliar, confira)";

function leiaMe(agora: Date): Aba {
  const avisos = [
    AVISO_CALCULO_AUXILIAR,
    "O Tempestivo não substitui a conferência do advogado: confira cada data nos autos.",
    ...(listarRegras().some((regra) => regra.status === "pendente") ? [AVISO_REGRAS_PENDENTES] : []),
    `Situação calculada em ${formatarData(dataCivilEmSaoPaulo(agora))}; ela não se atualiza no arquivo.`,
  ];
  return { nome: "Leia-me", colunas: [{ titulo: "Antes de usar", largura: 110 }], linhas: avisos.map((aviso) => [celula.texto(aviso)]) };
}

export async function abasDePrazos(contaId: string, { filtro }: { filtro?: string }, agora: Date): Promise<Aba[]> {
  // Como a tela: um filtro desconhecido vale como "em aberto".
  const escolhido = FILTROS_DE_PRAZOS.find((opcao) => opcao === filtro) ?? "em_aberto";
  const prazos = await listarPrazos(contaId, { filtro: escolhido }, agora);
  return [
    {
      nome: "Prazos",
      colunas: [
        { titulo: "Descrição", largura: 36 }, { titulo: "Cliente", largura: 30 }, { titulo: "Processo", largura: 36 },
        { titulo: "Número", largura: 28 }, { titulo: "Tribunal", largura: 10 }, { titulo: TITULO_DA_DATA_FINAL, largura: 40 },
        { titulo: "Origem da data", largura: 16 }, { titulo: "Meta interna", largura: 14 }, { titulo: "Situação", largura: 20 },
        { titulo: "Última conferência", largura: 19 }, { titulo: "Cumprido em", largura: 19 },
      ],
      linhas: prazos.map((prazo) => [
        celula.texto(prazo.descricao),
        celula.texto(prazo.processo.cliente.nome),
        celula.texto(prazo.processo.assunto),
        celula.texto(formatarNumeroCnj(prazo.processo.numero)),
        celula.texto(prazo.processo.tribunal),
        celula.data(prazo.dataFinal),
        celula.texto(prazo.origemDataFinal),
        celula.data(prazo.situacao.metaInterna),
        celula.texto(prazo.situacao.quando),
        celula.dataHora(prazo.ultimaConferenciaEm),
        celula.dataHora(prazo.cumpridoEm),
      ]),
    },
    leiaMe(agora),
  ];
}
