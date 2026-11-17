import { createHash, randomBytes } from "node:crypto";
import { dataCivilEmSaoPaulo, diasEntre, formatarDataComSemana, somarDias } from "@/lib/datas";
import { falha, sucesso, type Resultado } from "@/lib/resultado";
import { confirmarConferencia } from "@/modules/prazos";
import type { Logger } from "@/platform/logger";
import type { Email, Mailer } from "@/platform/mailer";
import { avisosDoDia, chaveDoAlerta, diasUteisAte, JANELA_EM_DIAS_CORRIDOS, type Aviso } from "./camadas";
import * as repositorio from "./repositorio";
import type { PrazoParaAlertar } from "./repositorio";

export type DependenciasDosAlertas = {
  mailer: Mailer;
  logger: Logger;
  appUrl: string;
  agora?: Date;
  /** Orçamento de tempo da execução; o que não couber fica para a próxima (o job é idempotente). */
  tempoMaximoMs?: number;
  relogio?: () => number;
};
export type ResumoDosAlertas = { analisados: number; enviados: number; falhas: number; limitados: number; adiados: number };

/** Teto de e-mails por conta por dia: uma conta não esgota a cota do SMTP de todas. */
export const LIMITE_DIARIO_POR_CONTA = 30;

const resumoDoToken = (token: string) => createHash("sha256").update(token).digest("hex");

function quando(diasRestantes: number): string {
  if (diasRestantes === 0) return "vence hoje";
  if (diasRestantes === 1) return "vence amanhã";
  return `vence em ${diasRestantes} dias`;
}

function escaparHtml(texto: string): string {
  return texto.replace(/[&<>"']/g, (caractere) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[caractere] ?? caractere);
}

function montarEmail(prazo: PrazoParaAlertar, aviso: Aviso, diasRestantes: number, link: string | null): Email {
  const data = formatarDataComSemana(prazo.dataFinal);
  const linhasDoPrazo = [`Prazo: ${prazo.descricao}`, `Processo: ${prazo.assuntoDoProcesso}`, `Data final: ${data}`];
  const rodape = "Cálculo auxiliar: a data deve ser conferida pelo advogado responsável.";

  // O substituto é terceiro: recebe só a data, nunca o processo, o cliente ou o ato.
  if (aviso.destino === "substituto") {
    const saudacao = prazo.substituto?.nome ? `Olá, ${prazo.substituto.nome}.` : "Olá.";
    const explicacao =
      `${prazo.titular.nome} tem um prazo que ${quando(diasRestantes)} (${data}) e ainda não registrou a conferência no Tempestivo. ` +
      "Você recebe este aviso porque aceitou ser o substituto. Por favor, entre em contato para confirmar que o prazo está sendo cuidado.";
    return {
      para: prazo.substituto!.email,
      assunto: `Prazo sem conferência de ${prazo.titular.nome}: ${quando(diasRestantes)}`,
      texto: [saudacao, "", explicacao, "", rodape].join("\n"),
    };
  }

  const pedido = prazo.status === "confirmado"
    ? "Você já conferiu este prazo. Se quiser, registre uma nova conferência:"
    : "Você ainda não registrou que conferiu este prazo. Confira a contagem e registre:";
  const texto = [`Olá, ${prazo.titular.nome}.`, "", `Um prazo ${quando(diasRestantes)}.`, "", ...linhasDoPrazo, "", pedido, link ?? "", "", rodape].join("\n");
  const html =
    `<p>Olá, ${escaparHtml(prazo.titular.nome)}.</p><p>Um prazo <strong>${quando(diasRestantes)}</strong>.</p>` +
    `<ul>${linhasDoPrazo.map((linha) => `<li>${escaparHtml(linha)}</li>`).join("")}</ul>` +
    `<p>${escaparHtml(pedido)}</p>` +
    (link ? `<p><a href="${escaparHtml(link)}">Abrir o prazo e registrar "li e conferi"</a></p>` : "") +
    `<p style="color:#666">${rodape}</p>`;
  return { para: prazo.titular.email, assunto: `Prazo ${quando(diasRestantes)}: ${prazo.descricao}`, texto, html };
}

/**
 * Job de alertas. Idempotente: cada aviso tem chave única (`prazo:camada:dataFinal`),
 * reservada no banco antes do envio. Falha de envio libera a reserva para a próxima
 * execução. O log nunca leva endereço de e-mail nem texto do prazo.
 */
export async function enviarAlertasPendentes({
  mailer, logger, appUrl, agora = new Date(), tempoMaximoMs = 45_000, relogio = Date.now,
}: DependenciasDosAlertas): Promise<ResumoDosAlertas> {
  const inicio = relogio();
  const hoje = dataCivilEmSaoPaulo(agora);
  // Meia-noite de hoje em São Paulo (UTC-3, sem horário de verão).
  const inicioDoDia = new Date(`${hoje}T03:00:00Z`);
  const enviadosHojePorConta = new Map<string, number>();
  const prazos = await repositorio.listarPrazosParaAlertar(hoje, somarDias(hoje, JANELA_EM_DIAS_CORRIDOS));
  const resumo: ResumoDosAlertas = { analisados: prazos.length, enviados: 0, falhas: 0, limitados: 0, adiados: 0 };

  for (const [indice, prazo] of prazos.entries()) {
    if (relogio() - inicio > tempoMaximoMs) {
      resumo.adiados = prazos.length - indice;
      break;
    }
    if (!enviadosHojePorConta.has(prazo.contaId)) {
      enviadosHojePorConta.set(prazo.contaId, await repositorio.contarAlertasDesde(prazo.contaId, inicioDoDia));
    }
    const diasRestantes = diasEntre(hoje, prazo.dataFinal);
    const avisos = avisosDoDia({ diasUteis: diasUteisAte(hoje, prazo.dataFinal), conferido: prazo.status === "confirmado", temSubstituto: prazo.substituto !== null });
    for (const aviso of avisos) {
      if (enviadosHojePorConta.get(prazo.contaId)! >= LIMITE_DIARIO_POR_CONTA) {
        resumo.limitados += 1;
        continue;
      }
      // O link "li e conferi" vai só para o titular e vale até o dia seguinte ao vencimento.
      const token = aviso.destino === "titular" ? randomBytes(32).toString("base64url") : null;
      const alertaId = await repositorio.reservar(prazo.contaId, {
        prazoId: prazo.id,
        chave: chaveDoAlerta(prazo.id, aviso.camada, prazo.dataFinal),
        camada: aviso.camada,
        destino: aviso.destino,
        tokenHash: token ? resumoDoToken(token) : null,
        tokenExpiraEm: token ? new Date(`${somarDias(prazo.dataFinal, 2)}T03:00:00Z`) : null,
      });
      if (alertaId === null) continue;
      enviadosHojePorConta.set(prazo.contaId, enviadosHojePorConta.get(prazo.contaId)! + 1);
      try {
        const link = token ? `${appUrl.replace(/\/$/, "")}/conferir/${token}` : null;
        await mailer.enviar(montarEmail(prazo, aviso, diasRestantes, link));
        await repositorio.marcarComoEnviado(prazo.contaId, alertaId, agora);
        resumo.enviados += 1;
      } catch (erro) {
        await repositorio.liberar(prazo.contaId, alertaId);
        resumo.falhas += 1;
        logger.error("falha ao enviar alerta", {
          prazoId: prazo.id, camada: aviso.camada, tipo: erro instanceof Error ? erro.name : typeof erro,
        });
      }
    }
  }
  if (resumo.limitados > 0) logger.warn("alertas acima do teto diário por conta", { limitados: resumo.limitados });
  if (resumo.adiados > 0) logger.warn("alertas adiados para a próxima execução", { adiados: resumo.adiados });
  logger.info("alertas processados", resumo);
  return resumo;
}

export type PrazoDoLink =
  | { jaConferidoPorEsteLink: false; descricao: string; assuntoDoProcesso: string; dataFinal: string; cumprido: boolean }
  | { jaConferidoPorEsteLink: true };

const LINK_INVALIDO = "Este link é inválido ou expirou. Entre no Tempestivo para conferir o prazo.";

async function alertaValido(token: string, agora: Date) {
  if (!/^[A-Za-z0-9_-]{20,100}$/.test(token)) return null;
  const alerta = await repositorio.buscarPeloToken(resumoDoToken(token));
  if (!alerta || !alerta.tokenExpiraEm || alerta.tokenExpiraEm <= agora) return null;
  return alerta;
}

/** O que a página do link mostra antes de o advogado confirmar. Abrir o link não registra nada. */
export async function obterPrazoDoLink(token: string, agora = new Date()): Promise<PrazoDoLink | null> {
  const alerta = await alertaValido(token, agora);
  if (!alerta) return null;
  // Depois de usado, o link (que pode ter sido encaminhado) não mostra mais nada do prazo.
  if (alerta.tokenUsadoEm !== null) return { jaConferidoPorEsteLink: true };
  return {
    descricao: alerta.prazo.descricao,
    assuntoDoProcesso: alerta.prazo.assuntoDoProcesso,
    dataFinal: alerta.prazo.dataFinal,
    jaConferidoPorEsteLink: false,
    cumprido: alerta.prazo.status === "cumprido",
  };
}

/** Registra o "li e conferi" pelo link do e-mail. O token vale uma vez só. */
export async function confirmarPeloLink(token: string, agora = new Date()): Promise<Resultado> {
  const alerta = await alertaValido(token, agora);
  if (!alerta) return falha(LINK_INVALIDO);
  if (!(await repositorio.consumirToken(alerta.contaId, alerta.id, agora))) return falha("Este link já foi usado.");
  return confirmarConferencia(alerta.contaId, alerta.prazoId, "email", null, agora).then((resultado) => (resultado.ok ? sucesso() : resultado));
}
