import { dataCivilEmSaoPaulo, somarDias } from "@/lib/datas";
import { gerarCalendario, type EventoIcs } from "@/lib/icalendar";
import { listarProximasAudiencias } from "@/modules/audiencias";
import { contaDaAgenda } from "@/modules/conta";
import { listarPrazos, type PrazoComSituacao } from "@/modules/prazos";
import { formatarNumeroCnj } from "@/modules/processos";

// Agenda assinável: um feed iCalendar que o advogado assina uma vez no calendário do
// celular (Google, Apple, Outlook) e que se atualiza sozinho. O provedor do calendário
// guarda o que estiver aqui, então o feed leva o mínimo: o ato, o número do processo
// e as datas. Nome de cliente, de parte e o assunto nunca entram, nem o link da sala
// virtual (que costuma levar a senha). A descrição do prazo e o local da audiência são
// texto do próprio advogado, e a tela avisa que vão para o calendário.

const NOVE_DA_MANHA = 9 * 60;
// Prazo vencido continua no feed por um tempo, para não sumir do calendário de repente,
// mas não para sempre: o feed é baixado a cada hora.
const DIAS_DE_VENCIDOS_NO_FEED = 90;
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
      descricao: `Data-alvo interna para ter o trabalho pronto, calculada pelo Tempestivo (auxiliar, não é prazo legal). Vencimento em ${prazo.dataFinal.split("-").reverse().join("/")}.\n${descricao}`,
      url: link,
      lembreteMin: NOVE_DA_MANHA,
    });
  }
  return eventos;
}

/**
 * O conteúdo do feed, ou `null` se o link é inválido ou foi trocado. Leva os prazos
 * em aberto (inclusive os vencidos nos últimos 90 dias, para não sumirem do calendário) e as próximas
 * audiências.
 */
export async function gerarFeedDaAgenda(token: string, appUrl: string, agora = new Date()): Promise<string | null> {
  const contaId = await contaDaAgenda(token);
  if (!contaId) return null;
  const base = appUrl.replace(/\/$/, "");
  const [emAberto, audiencias] = await Promise.all([listarPrazos(contaId, { filtro: "em_aberto" }, agora), listarProximasAudiencias(contaId, agora)]);
  const corte = somarDias(dataCivilEmSaoPaulo(agora), -DIAS_DE_VENCIDOS_NO_FEED);
  const prazos = emAberto.filter((prazo) => prazo.dataFinal >= corte);
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
            local: audiencia.local ?? (audiencia.linkVirtual ? "Audiência virtual (link no Tempestivo)" : null),
            descricao: `Processo ${formatarNumeroCnj(audiencia.processo.numero)}\nAbrir no Tempestivo: ${base}/audiencias`,
            lembreteMin: -60,
          }),
        ),
      ],
    },
    agora,
  );
}
