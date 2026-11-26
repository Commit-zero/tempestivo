// Aviso do resultado de uma ação. Entre a ação e a tela viaja só uma chave desta lista,
// num cookie de poucos segundos: nunca nome, número de processo ou texto digitado.
// Cada mensagem usa o mesmo verbo do botão que a causou.

export const COOKIE_DO_AVISO = "tempestivo.aviso";

export const AVISOS = {
  "cliente-cadastrado": "Cliente cadastrado.",
  "cliente-excluido": "Cliente excluído.",
  "processo-cadastrado": "Processo cadastrado.",
  "processo-salvo": "Processo salvo.",
  "processo-arquivado": "Processo arquivado.",
  "processo-reativado": "Processo reativado.",
  "processo-excluido": "Processo excluído.",
  "prazo-salvo": "Prazo salvo.",
  "prazo-conferido": "Conferência registrada.",
  "prazo-cumprido": "Prazo marcado como cumprido.",
  "prazo-reaberto": "Cumprido desfeito.",
  "prazo-excluido": "Prazo excluído.",
  "audiencia-cadastrada": "Audiência cadastrada.",
  "audiencia-salva": "Audiência salva.",
  "audiencia-excluida": "Audiência excluída.",
  "honorario-cadastrado": "Honorário cadastrado.",
  "honorario-excluido": "Honorário excluído.",
  "parcela-paga": "Parcela marcada como paga.",
  "parcela-reaberta": "Pagamento da parcela desfeito.",
  "tarefa-adicionada": "Tarefa adicionada.",
  "tarefa-excluida": "Tarefa excluída.",
  "tipo-restaurado": "Tipo de prazo voltou ao padrão.",
  "tipo-excluido": "Tipo de prazo excluído.",
  "dia-excluido": "Dia sem expediente excluído.",
} as const;

export type ChaveDeAviso = keyof typeof AVISOS;

export const codificarAviso = (chave: ChaveDeAviso, instante: number) => `${chave}.${instante}`;

/** A mensagem do cookie, ou `null` quando o valor não é uma chave desta lista. */
export function lerAviso(valor: string | undefined): { id: string; texto: string } | null {
  const [, chave] = /^([a-z-]+)\.\d+$/.exec(valor ?? "") ?? [];
  if (!chave || !Object.hasOwn(AVISOS, chave)) return null;
  return { id: valor!, texto: AVISOS[chave as ChaveDeAviso] };
}
