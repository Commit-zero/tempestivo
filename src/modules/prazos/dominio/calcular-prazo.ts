import type { Calendario } from "./calendario";
import { ehDataCivil, formatarData, formatarDataComSemana, somarDias, type DataCivil } from "@/lib/datas";
import { REGRAS, type ChaveDeRegra } from "./regras";

export type TipoEvento = "intimacao" | "disponibilizacao" | "publicacao" | "intimacao_tacita";
export type Contagem = "uteis" | "corridos";

export const TIPOS_DE_EVENTO: readonly TipoEvento[] = ["intimacao", "disponibilizacao", "publicacao", "intimacao_tacita"];
export const CONTAGENS: readonly Contagem[] = ["uteis", "corridos"];

export type EntradaCalculo = {
  dataEvento: DataCivil;
  tipoEvento: TipoEvento;
  dias: number;
  contagem: Contagem;
  emDobro: boolean;
  tribunal: string;
  /** Só `dias` é calculado; prazo em horas é recusado. */
  unidade?: "dias" | "horas";
};

export type ResultadoCalculo =
  | {
      ok: true;
      dataInicio: DataCivil;
      dataFinal: DataCivil;
      passos: string[];
      avisos: string[];
      regrasAplicadas: string[];
    }
  | { ok: false; motivo: string };

export const AVISO_CALCULO_AUXILIAR = "Cálculo auxiliar, confira.";
export const AVISO_REGRAS_PENDENTES =
  "As regras deste cálculo ainda não foram validadas por um advogado. Confira a contagem antes de confiar na data.";

const MAXIMO_DE_DIAS = 365;
const DIAS_DA_INTIMACAO_TACITA = 10;
// Teto de segurança para os laços: nenhum intervalo sem dia útil passa disso
// (o recesso tem 32 dias). Se estourar, o calendário injetado está errado.
const LIMITE_DE_BUSCA = 120;

class CalendarioSemDiaUtil extends Error {}

function recusar(motivo: string): ResultadoCalculo {
  return { ok: false, motivo: `${motivo} Informe a data final manualmente.` };
}

export function calcularPrazo(entrada: EntradaCalculo, calendario: Calendario | null): ResultadoCalculo {
  if (!calendario || calendario.tribunal.sigla !== entrada.tribunal) {
    return recusar("Este tribunal está fora do escopo da calculadora (só TJSP e TRT-2).");
  }
  if ((entrada.unidade ?? "dias") !== "dias") {
    return recusar("A calculadora não conta prazos em horas.");
  }
  if (!ehDataCivil(entrada.dataEvento)) {
    return recusar("A data do evento é inválida.");
  }
  if (!Number.isInteger(entrada.dias) || entrada.dias < 1 || entrada.dias > MAXIMO_DE_DIAS) {
    return recusar(`A quantidade de dias precisa ser um número inteiro de 1 a ${MAXIMO_DE_DIAS}.`);
  }
  if (!CONTAGENS.includes(entrada.contagem)) {
    return recusar("O tipo de contagem é desconhecido.");
  }
  if (!TIPOS_DE_EVENTO.includes(entrada.tipoEvento)) {
    return recusar("O tipo de evento é desconhecido.");
  }
  try {
    return contar(entrada, calendario);
  } catch (erro) {
    if (erro instanceof CalendarioSemDiaUtil) return recusar("Não foi possível achar um dia útil no calendário.");
    throw erro;
  }
}

function contar(entrada: EntradaCalculo, calendario: Calendario): ResultadoCalculo {
  const ramo = calendario.tribunal.ramo;
  const passos: string[] = [];
  const avisos: string[] = [AVISO_CALCULO_AUXILIAR];
  const regras = new Set<ChaveDeRegra>();

  const ehUtil = (data: DataCivil) => calendario.motivoSemExpediente(data) === null && !calendario.emRecesso(data);
  const motivoDe = (data: DataCivil) =>
    calendario.emRecesso(data) ? "recesso forense" : (calendario.motivoSemExpediente(data) ?? "dia útil");

  function utilEmOuDepois(data: DataCivil): DataCivil {
    let atual = data;
    for (let tentativa = 0; tentativa < LIMITE_DE_BUSCA; tentativa += 1) {
      if (ehUtil(atual)) return atual;
      atual = somarDias(atual, 1);
    }
    throw new CalendarioSemDiaUtil();
  }
  const proximoUtil = (data: DataCivil) => utilEmOuDepois(somarDias(data, 1));

  // 1. Dia do começo: a data em que a intimação ou a publicação se considera feita.
  let diaDoComeco: DataCivil;
  switch (entrada.tipoEvento) {
    case "intimacao": {
      diaDoComeco = utilEmOuDepois(entrada.dataEvento);
      if (diaDoComeco === entrada.dataEvento) {
        passos.push(`Intimação em ${formatarDataComSemana(entrada.dataEvento)}: é o dia do começo, que não entra na contagem.`);
      } else {
        regras.add("intimacaoEletronica");
        passos.push(
          `Intimação em ${formatarDataComSemana(entrada.dataEvento)}, dia sem expediente (${motivoDe(entrada.dataEvento)}): ` +
            `considera-se feita em ${formatarDataComSemana(diaDoComeco)}, o primeiro dia útil seguinte.`,
        );
      }
      break;
    }
    case "publicacao": {
      diaDoComeco = utilEmOuDepois(entrada.dataEvento);
      if (diaDoComeco === entrada.dataEvento) {
        passos.push(`Publicação em ${formatarDataComSemana(entrada.dataEvento)}: é o dia do começo, que não entra na contagem.`);
      } else {
        regras.add("semExpediente");
        passos.push(
          `Publicação informada em ${formatarDataComSemana(entrada.dataEvento)}, dia sem expediente (${motivoDe(entrada.dataEvento)}): ` +
            `foi considerada em ${formatarDataComSemana(diaDoComeco)}.`,
        );
        avisos.push("A data de publicação informada cai em dia sem expediente. Confira se a data está certa.");
      }
      break;
    }
    case "disponibilizacao": {
      regras.add("disponibilizacao");
      diaDoComeco = proximoUtil(entrada.dataEvento);
      passos.push(
        `Disponibilização no diário eletrônico em ${formatarDataComSemana(entrada.dataEvento)}: ` +
          `a publicação é o primeiro dia útil seguinte, ${formatarDataComSemana(diaDoComeco)}.`,
      );
      break;
    }
    case "intimacao_tacita": {
      regras.add("intimacaoTacita");
      const fimDosDezDias = somarDias(entrada.dataEvento, DIAS_DA_INTIMACAO_TACITA);
      for (let dia = entrada.dataEvento; dia <= fimDosDezDias; dia = somarDias(dia, 1)) {
        if (calendario.emRecesso(dia)) {
          return recusar("Os 10 dias da intimação eletrônica não consultada passam pelo recesso, e a contagem nesse caso é controvertida.");
        }
      }
      diaDoComeco = utilEmOuDepois(fimDosDezDias);
      passos.push(
        `Intimação eletrônica enviada em ${formatarDataComSemana(entrada.dataEvento)} e não consultada: ` +
          `os 10 dias corridos terminam em ${formatarDataComSemana(fimDosDezDias)}.`,
      );
      if (diaDoComeco !== fimDosDezDias) {
        regras.add("intimacaoEletronica");
        passos.push(
          `Como ${formatarData(fimDosDezDias)} não é dia útil (${motivoDe(fimDosDezDias)}), ` +
            `a intimação considera-se feita em ${formatarDataComSemana(diaDoComeco)}.`,
        );
      }
      break;
    }
  }

  // 2. Quantidade de dias.
  const total = entrada.emDobro ? entrada.dias * 2 : entrada.dias;
  if (entrada.emDobro) {
    regras.add("emDobro");
    passos.push(`Prazo em dobro: ${entrada.dias} dias viram ${total} dias.`);
  }

  // 3. Primeiro dia da contagem.
  regras.add("comecoEVencimento");
  const dataInicio = proximoUtil(diaDoComeco);
  passos.push(`A contagem começa em ${formatarDataComSemana(dataInicio)}, o primeiro dia útil seguinte.`);

  // 4. Contagem.
  let dataFinal: DataCivil;
  if (entrada.contagem === "uteis") {
    regras.add("diasUteis");
    dataFinal = dataInicio;
    for (let contados = 1; contados < total; contados += 1) dataFinal = proximoUtil(dataFinal);
    passos.push(`Contados ${total} dias úteis, sem sábados, domingos, feriados e dias sem expediente.`);
  } else {
    const ultimoCorrido = somarDias(dataInicio, total - 1);
    for (let dia = diaDoComeco; dia <= ultimoCorrido; dia = somarDias(dia, 1)) {
      if (calendario.emRecesso(dia)) {
        return recusar("O prazo em dias corridos passa pelo recesso de 20/12 a 20/01, e a contagem nesse caso é duvidosa.");
      }
    }
    dataFinal = utilEmOuDepois(ultimoCorrido);
    passos.push(`Contados ${total} dias corridos: o último é ${formatarDataComSemana(ultimoCorrido)}.`);
    if (dataFinal !== ultimoCorrido) {
      regras.add("semExpediente");
      passos.push(
        `Como ${formatarData(ultimoCorrido)} não tem expediente (${motivoDe(ultimoCorrido)}), ` +
          `o vencimento passa para ${formatarDataComSemana(dataFinal)}.`,
      );
    }
  }

  // 5. O que ficou fora da contagem e o que depende de portaria.
  const naoContados: string[] = [];
  let passouPeloRecesso = false;
  for (let dia = entrada.dataEvento; dia < dataFinal; dia = somarDias(dia, 1)) {
    if (calendario.emRecesso(dia)) {
      passouPeloRecesso = true;
      continue;
    }
    const motivo = calendario.motivoSemExpediente(dia);
    if (dia !== entrada.dataEvento && motivo !== null && motivo !== "sábado" && motivo !== "domingo") {
      naoContados.push(`${formatarData(dia)} (${motivo})`);
    }
  }
  for (let dia = entrada.dataEvento; dia <= dataFinal; dia = somarDias(dia, 1)) {
    const ponto = calendario.pontoDependente(dia);
    if (ponto !== null) {
      avisos.push(
        `${formatarData(dia)} é ${ponto}: o expediente depende de portaria do tribunal e o dia foi contado como útil. ` +
          "Se não houver expediente, cadastre o dia e recalcule.",
      );
    }
  }
  if (naoContados.length > 0) {
    regras.add("semExpediente");
    passos.push(`Dias sem expediente no período: ${naoContados.join(", ")}.`);
  }
  if (passouPeloRecesso) {
    regras.add("recesso");
    passos.push("O prazo ficou suspenso durante o recesso de 20/12 a 20/01.");
  }
  passos.push(`Data final: ${formatarDataComSemana(dataFinal)}.`);

  const aplicadas = [...regras].map((chave) => REGRAS[chave]);
  if (aplicadas.some((regra) => regra.status === "pendente")) avisos.push(AVISO_REGRAS_PENDENTES);

  return {
    ok: true,
    dataInicio,
    dataFinal,
    passos,
    avisos,
    regrasAplicadas: aplicadas.map((regra) => `${regra.id}: ${regra.descricao} (${regra.referencia[ramo]})`),
  };
}
