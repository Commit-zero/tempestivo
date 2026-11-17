import { diaDaSemana, somarDias, type DataCivil } from "@/lib/datas";

// Regras puras dos alertas: qual aviso um prazo pede hoje.

export type Camada = "d5" | "d2" | "d1" | "d0";
export type Aviso = { camada: Camada | "escalada"; destino: "titular" | "substituto" };

/** Camadas da mais urgente para a mais distante, em dias úteis que faltam para o vencimento. */
const CAMADAS: readonly { camada: Camada; ate: number }[] = [
  { camada: "d0", ate: 0 },
  { camada: "d1", ate: 1 },
  { camada: "d2", ate: 2 },
  { camada: "d5", ate: 5 },
];

export const DIAS_UTEIS_DA_PRIMEIRA_CAMADA = 5;
/** Janela em dias corridos que cobre 5 dias úteis mesmo com fim de semana e feriado no meio. */
export const JANELA_EM_DIAS_CORRIDOS = 9;
const DIAS_UTEIS_PARA_ESCALAR = 1;

/**
 * Dias de segunda a sexta depois de `hoje` até o vencimento, inclusive. Assim, para um
 * prazo de segunda-feira, a véspera é a sexta, e não o domingo. Feriados não entram na
 * conta: num feriado no meio, o aviso chega um dia antes do ideal, nunca depois.
 */
export function diasUteisAte(hoje: DataCivil, vencimento: DataCivil): number {
  if (vencimento < hoje) return -1;
  let dias = 0;
  for (let dia = somarDias(hoje, 1); dia <= vencimento; dia = somarDias(dia, 1)) {
    const semana = diaDaSemana(dia);
    if (semana !== 0 && semana !== 6) dias += 1;
  }
  return dias;
}

/**
 * Avisos que o prazo pede com `diasUteis` dias úteis pela frente.
 * - Titular: só a camada mais urgente que se aplica. Um prazo cadastrado na véspera
 *   recebe um aviso, não três.
 * - Substituto: na véspera útil (ou no dia), se o titular ainda não conferiu e há substituto.
 * Prazo vencido não gera aviso novo: o painel já o destaca.
 */
export function avisosDoDia(prazo: { diasUteis: number; conferido: boolean; temSubstituto: boolean }): Aviso[] {
  if (prazo.diasUteis < 0 || prazo.diasUteis > DIAS_UTEIS_DA_PRIMEIRA_CAMADA) return [];
  const avisos: Aviso[] = [];
  const camada = CAMADAS.find((opcao) => prazo.diasUteis <= opcao.ate);
  if (camada) avisos.push({ camada: camada.camada, destino: "titular" });
  if (prazo.diasUteis <= DIAS_UTEIS_PARA_ESCALAR && !prazo.conferido && prazo.temSubstituto) {
    avisos.push({ camada: "escalada", destino: "substituto" });
  }
  return avisos;
}

/** Chave única do envio: rodar o job duas vezes no mesmo dia não duplica o e-mail. */
export function chaveDoAlerta(prazoId: string, camada: Aviso["camada"], dataFinal: string): string {
  return `${prazoId}:${camada}:${dataFinal}`;
}
