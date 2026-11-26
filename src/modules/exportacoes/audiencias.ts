import { celula, type Aba } from "@/lib/planilha";
import { dataEHoraEmSaoPaulo, listarAudienciasPassadas, listarProximasAudiencias, type Audiencia } from "@/modules/audiencias";
import { formatarNumeroCnj } from "@/modules/processos";

// Sem o link da sala virtual: ele costuma levar a senha.
function aba(nome: string, audiencias: Audiencia[]): Aba {
  return {
    nome,
    colunas: [
      { titulo: "Data", largura: 14 }, { titulo: "Hora", largura: 8 }, { titulo: "Duração em minutos", largura: 20 },
      { titulo: "Tipo", largura: 28 }, { titulo: "Cliente", largura: 30 }, { titulo: "Processo", largura: 36 },
      { titulo: "Número", largura: 28 }, { titulo: "Local", largura: 36 }, { titulo: "Observações", largura: 50 },
    ],
    linhas: audiencias.map((audiencia) => {
      const { data, hora } = dataEHoraEmSaoPaulo(audiencia.inicio);
      return [
        celula.data(data),
        celula.texto(hora),
        celula.inteiro(audiencia.duracaoMin),
        celula.texto(audiencia.tipo),
        celula.texto(audiencia.processo.cliente.nome),
        celula.texto(audiencia.processo.assunto),
        celula.texto(formatarNumeroCnj(audiencia.processo.numero)),
        celula.texto(audiencia.local),
        celula.texto(audiencia.observacoes),
      ];
    }),
  };
}

export async function abasDeAudiencias(contaId: string, _filtros: unknown, agora: Date): Promise<Aba[]> {
  const [proximas, realizadas] = await Promise.all([listarProximasAudiencias(contaId, agora), listarAudienciasPassadas(contaId, agora)]);
  return [aba("Próximas", proximas), aba("Realizadas", realizadas)];
}
