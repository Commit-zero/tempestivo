// Resultado de um caso de uso: ou o valor, ou uma mensagem em português para a tela.
export type Resultado<T = void> = { ok: true; valor: T } | { ok: false; erro: string };

export function sucesso(): Resultado<void>;
export function sucesso<T>(valor: T): Resultado<T>;
export function sucesso<T>(valor?: T): Resultado<T | void> {
  return { ok: true, valor };
}

export function falha(erro: string): { ok: false; erro: string } {
  return { ok: false, erro };
}

/** Primeira mensagem de um erro do zod, que é a que a tela mostra. */
export function primeiraMensagem(erro: { issues: readonly { message: string }[] }): string {
  return erro.issues[0]?.message ?? "Dados inválidos.";
}
