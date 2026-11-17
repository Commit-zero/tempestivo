import { diaDaSemana, somarDias, type DataCivil } from "@/lib/datas";
import type { Calendario } from "./calendario";
import { criarIndiceDeFeriados, feriadosNacionais } from "./feriados";

const feriadoNacionalEm = criarIndiceDeFeriados(feriadosNacionais);

export const MARGEM_PADRAO_DIAS_UTEIS = 2;
export const MARGEM_MAXIMA_DIAS_UTEIS = 10;

/**
 * Meta interna: a data em que o advogado quer ter o trabalho pronto, N dias úteis
 * antes do vencimento. Conta dias de trabalho do advogado (sem fins de semana,
 * feriados e dias sem expediente cadastrados), não dias de prazo: a suspensão de
 * 20/12 a 20/01 não entra, porque nela o escritório trabalha.
 *
 * Sem calendário do tribunal (data manual em tribunal fora do escopo), usa os
 * fins de semana e os feriados nacionais.
 */
export function metaInterna(dataFinal: DataCivil, margemDiasUteis: number, calendario: Calendario | null): DataCivil {
  const margem = Math.max(0, Math.min(MARGEM_MAXIMA_DIAS_UTEIS, Math.trunc(margemDiasUteis)));
  const diaDeTrabalho = (data: DataCivil) =>
    calendario
      ? calendario.motivoSemExpediente(data) === null
      : diaDaSemana(data) !== 0 && diaDaSemana(data) !== 6 && feriadoNacionalEm(data) === undefined;

  let meta = dataFinal;
  for (let contados = 0; contados < margem; ) {
    meta = somarDias(meta, -1);
    if (diaDeTrabalho(meta)) contados += 1;
  }
  return meta;
}
