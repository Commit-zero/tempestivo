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
  if (entrada.contagem !== "uteis") {
    return recusar("A calculadora só conta prazos processuais em dias úteis (CPC, art. 219; CLT, art. 775).");
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

  // Dois conceitos que não se confundem:
  // - dia com expediente: fixa quando a intimação ou a publicação se considera feita;
  // - dia que conta: além do expediente, fora da suspensão de 20/12 a 20/01.
  // A suspensão impede o prazo de correr, mas não adia o dia do começo (CPC, arts. 220
  // e 224): uma intimação em 15/01 começa a contar em 21/01, não em 22/01.
  const temExpediente = (data: DataCivil) => calendario.motivoSemExpediente(data) === null;
  const conta = (data: DataCivil) => temExpediente(data) && !calendario.emRecesso(data);
  const motivoDe = (data: DataCivil) => calendario.motivoSemExpediente(data) ?? "dia útil";

  function primeiroEmOuDepois(data: DataCivil, aceita: (dia: DataCivil) => boolean): DataCivil {
    let atual = data;
    for (let tentativa = 0; tentativa < LIMITE_DE_BUSCA; tentativa += 1) {
      if (aceita(atual)) return atual;
      atual = somarDias(atual, 1);
    }
    throw new CalendarioSemDiaUtil();
  }
  const expedienteEmOuDepois = (data: DataCivil) => primeiroEmOuDepois(data, temExpediente);
  const proximoQueConta = (data: DataCivil) => primeiroEmOuDepois(somarDias(data, 1), conta);

  // 1. Dia do começo: a data em que a intimação ou a publicação se considera feita.
  let diaDoComeco: DataCivil;
  switch (entrada.tipoEvento) {
    case "intimacao": {
      diaDoComeco = expedienteEmOuDepois(entrada.dataEvento);
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
      diaDoComeco = expedienteEmOuDepois(entrada.dataEvento);
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
      diaDoComeco = expedienteEmOuDepois(somarDias(entrada.dataEvento, 1));
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
      diaDoComeco = expedienteEmOuDepois(fimDosDezDias);
      passos.push(
        `Intimação eletrônica enviada em ${formatarDataComSemana(entrada.dataEvento)} e não consultada: ` +
          `os 10 dias corridos terminam em ${formatarDataComSemana(fimDosDezDias)}.`,
      );
      if (diaDoComeco !== fimDosDezDias) {
        regras.add("semExpediente");
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
  const dataInicio = proximoQueConta(diaDoComeco);
  if (calendario.emRecesso(diaDoComeco) || calendario.emRecesso(somarDias(diaDoComeco, 1))) {
    regras.add("recesso");
    passos.push(
      `O dia do começo, ${formatarData(diaDoComeco)}, cai na suspensão de 20/12 a 20/01 ou logo antes dela: ` +
        `o prazo só começa a correr depois, em ${formatarDataComSemana(dataInicio)}.`,
    );
  } else {
    passos.push(`A contagem começa em ${formatarDataComSemana(dataInicio)}, o primeiro dia útil seguinte.`);
  }

  // 4. Contagem em dias úteis.
  regras.add("diasUteis");
  let dataFinal = dataInicio;
  for (let contados = 1; contados < total; contados += 1) dataFinal = proximoQueConta(dataFinal);
  passos.push(`Contados ${total} dias úteis, sem sábados, domingos, feriados e dias sem expediente.`);

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
        `${formatarData(dia)} é ${ponto}: pode não ter havido expediente, e o dia foi contado como útil (a data sai mais cedo). ` +
          "Se não houve expediente no seu foro, cadastre o dia e recalcule.",
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
