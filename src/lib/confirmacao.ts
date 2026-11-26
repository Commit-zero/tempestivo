// O que apaga só é feito com a confirmação dada no diálogo. A conferência é no servidor:
// um envio direto, ou uma página sem JavaScript, não apaga nada.

export const CAMPO_DE_CONFIRMACAO = "confirmado";
export const VALOR_CONFIRMADO = "sim";
export const SEM_CONFIRMACAO = "Confirme na janela antes de apagar.";

export function foiConfirmado(formulario: FormData | undefined): boolean {
  return typeof formulario?.get === "function" && formulario.get(CAMPO_DE_CONFIRMACAO) === VALOR_CONFIRMADO;
}
