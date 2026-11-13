// Regras puras dos alertas: qual aviso um prazo pede hoje.

export type Camada = "d5" | "d2" | "d1" | "d0";
export type Aviso = { camada: Camada | "escalada"; destino: "titular" | "substituto" };

/** Camadas da mais distante para a mais urgente: dias corridos que faltam para o vencimento. */
const CAMADAS: readonly { camada: Camada; ate: number }[] = [
  { camada: "d0", ate: 0 },
  { camada: "d1", ate: 1 },
  { camada: "d2", ate: 2 },
  { camada: "d5", ate: 5 },
];

export const DIAS_DA_PRIMEIRA_CAMADA = 5;
const DIAS_PARA_ESCALAR = 1;

/**
 * Avisos que o prazo pede com `diasRestantes` dias pela frente.
 * - Titular: só a camada mais urgente que se aplica. Um prazo cadastrado na véspera
 *   recebe um aviso, não três.
 * - Substituto: na véspera (ou no dia), se o titular ainda não conferiu e há substituto.
 * Prazo vencido não gera aviso novo: o painel já o destaca.
 */
export function avisosDoDia(prazo: { diasRestantes: number; conferido: boolean; temSubstituto: boolean }): Aviso[] {
  if (prazo.diasRestantes < 0 || prazo.diasRestantes > DIAS_DA_PRIMEIRA_CAMADA) return [];
  const avisos: Aviso[] = [];
  const camada = CAMADAS.find((opcao) => prazo.diasRestantes <= opcao.ate);
  if (camada) avisos.push({ camada: camada.camada, destino: "titular" });
  if (prazo.diasRestantes <= DIAS_PARA_ESCALAR && !prazo.conferido && prazo.temSubstituto) {
    avisos.push({ camada: "escalada", destino: "substituto" });
  }
  return avisos;
}

/** Chave única do envio: rodar o job duas vezes no mesmo dia não duplica o e-mail. */
export function chaveDoAlerta(prazoId: string, camada: Aviso["camada"], dataFinal: string): string {
  return `${prazoId}:${camada}:${dataFinal}`;
}
