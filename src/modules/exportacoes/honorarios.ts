import { celula, type Aba } from "@/lib/planilha";
import { listarHonorarios, type SituacaoDaParcela } from "@/modules/honorarios";

const SITUACOES: Record<SituacaoDaParcela, string> = {
  paga: "paga", em_atraso: "em atraso", vence_hoje: "vence hoje", a_vencer: "a vencer",
};

export async function abasDeHonorarios(contaId: string, _filtros: unknown, agora: Date): Promise<Aba[]> {
  const honorarios = await listarHonorarios(contaId, agora);
  return [
    {
      nome: "Honorários",
      colunas: [
        { titulo: "Cliente", largura: 32 }, { titulo: "Descrição", largura: 40 }, { titulo: "Processo", largura: 36 },
        { titulo: "Total", largura: 16 }, { titulo: "Pago", largura: 16 }, { titulo: "Em aberto", largura: 16 },
        { titulo: "Em atraso", largura: 16 },
      ],
      linhas: honorarios.map((honorario) => [
        celula.texto(honorario.cliente.nome),
        celula.texto(honorario.descricao),
        celula.texto(honorario.processo?.assunto),
        celula.dinheiro(honorario.totalCentavos),
        celula.dinheiro(honorario.recebidoCentavos),
        celula.dinheiro(honorario.totalCentavos - honorario.recebidoCentavos),
        celula.dinheiro(honorario.emAtrasoCentavos),
      ]),
    },
    {
      nome: "Parcelas",
      colunas: [
        { titulo: "Cliente", largura: 32 }, { titulo: "Descrição", largura: 40 }, { titulo: "Parcela", largura: 10 },
        { titulo: "Valor", largura: 16 }, { titulo: "Vencimento", largura: 14 }, { titulo: "Situação", largura: 14 },
        { titulo: "Paga em", largura: 19 },
      ],
      linhas: honorarios.flatMap((honorario) =>
        honorario.parcelas.map((parcela) => [
          celula.texto(honorario.cliente.nome),
          celula.texto(honorario.descricao),
          celula.texto(`${parcela.numero} de ${honorario.parcelas.length}`),
          celula.dinheiro(parcela.valorCentavos),
          celula.data(parcela.vencimento),
          celula.texto(SITUACOES[parcela.situacao]),
          celula.dataHora(parcela.pagaEm),
        ]),
      ),
    },
  ];
}
