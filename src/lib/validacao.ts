import { z } from "zod";

/** Campo de texto opcional de formulário: apara os espaços e transforma vazio em `null`. */
export const textoOpcional = (maximo: number) =>
  z
    .string()
    .trim()
    .max(maximo, `Use no máximo ${maximo} caracteres.`)
    .transform((texto) => (texto === "" ? null : texto))
    .nullish()
    .transform((valor) => valor ?? null);
