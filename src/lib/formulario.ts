// Contrato entre as server actions e os formulários. Fica fora dos componentes
// "use client" porque as ações rodam no servidor.

/** Estado devolvido pelas server actions de formulário. */
export type EstadoDoFormulario = {
  erro?: string;
  aviso?: string;
  /** O React limpa o formulário depois da ação; os valores voltam por aqui (nunca senhas). */
  valores?: Record<string, string>;
};

/** Lê do formulário os campos de texto que devem voltar preenchidos depois de um erro. */
export function valoresDe(formulario: FormData, campos: readonly string[]): Record<string, string> {
  return Object.fromEntries(campos.map((campo) => [campo, String(formulario.get(campo) ?? "")]));
}
