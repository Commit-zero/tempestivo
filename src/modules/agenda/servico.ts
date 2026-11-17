import { gerarCalendario, type EventoIcs } from "@/lib/icalendar";
import { listarProximasAudiencias } from "@/modules/audiencias";
import { contaDaAgenda } from "@/modules/conta";
import { listarPrazos, type PrazoComSituacao } from "@/modules/prazos";
import { formatarNumeroCnj } from "@/modules/processos";

// Agenda assinável: um feed iCalendar que o advogado assina uma vez no calendário do
// celular (Google, Apple, Outlook) e que se atualiza sozinho. O provedor do calendário
// guarda o que estiver aqui, então o feed leva o mínimo: o ato, o número do processo
// (dado público) e as datas. Nome de cliente e de parte nunca entram.

const NOVE_DA_MANHA = 9 * 60;
const VESPERA_AS_NOVE = -15 * 60;

function eventosDoPrazo(prazo: PrazoComSituacao, appUrl: string): EventoIcs[] {
  const link = `${appUrl}/prazos/${prazo.id}`;
  const descricao = [
    `Processo ${formatarNumeroCnj(prazo.processo.numero)} (${prazo.processo.tribunal})`,
    prazo.origemDataFinal === "manual" ? "Data final digitada pelo advogado." : "Cálculo auxiliar: confira a data nos autos.",
    `Abrir no Tempestivo: ${link}`,
  ].join("\n");
  const eventos: EventoIcs[] = [
    {
      uid: `prazo-${prazo.id}-vencimento@tempestivo`,
      titulo: `Vence: ${prazo.descricao}`,
      quando: { dia: prazo.dataFinal },
      descricao,
      url: link,
      lembreteMin: VESPERA_AS_NOVE,
    },
  ];
  if (prazo.situacao.metaInterna) {
    eventos.push({
      uid: `prazo-${prazo.id}-meta@tempestivo`,
      titulo: `Meta interna: ${prazo.descricao}`,
      quando: { dia: prazo.situacao.metaInterna },
      descricao: `Data para ter o trabalho pronto, antes do vencimento em ${prazo.dataFinal.split("-").reverse().join("/")}.\n${descricao}`,
      url: link,
      lembreteMin: NOVE_DA_MANHA,
    });
  }
  return eventos;
}

/**
 * O conteúdo do feed, ou `null` se o link é inválido ou foi trocado. Leva os prazos
 * em aberto (inclusive os vencidos, para não sumirem do calendário) e as próximas
 * audiências.
 */
export async function gerarFeedDaAgenda(token: string, appUrl: string, agora = new Date()): Promise<string | null> {
  const contaId = await contaDaAgenda(token);
  if (!contaId) return null;
  const base = appUrl.replace(/\/$/, "");
  const [prazos, audiencias] = await Promise.all([listarPrazos(contaId, { filtro: "em_aberto" }, agora), listarProximasAudiencias(contaId, agora)]);
  return gerarCalendario(
    {
      nome: "Tempestivo: prazos e audiências",
      atualizarACadaMin: 60,
      eventos: [
        ...prazos.flatMap((prazo) => eventosDoPrazo(prazo, base)),
        ...audiencias.map(
          (audiencia): EventoIcs => ({
            uid: `audiencia-${audiencia.id}@tempestivo`,
            titulo: `Audiência: ${audiencia.tipo}`,
            quando: { inicio: audiencia.inicio, duracaoMin: audiencia.duracaoMin },
            local: audiencia.local ?? audiencia.linkVirtual,
            descricao: `Processo ${formatarNumeroCnj(audiencia.processo.numero)}\nAbrir no Tempestivo: ${base}/audiencias`,
            lembreteMin: -60,
          }),
        ),
      ],
    },
    agora,
  );
}
