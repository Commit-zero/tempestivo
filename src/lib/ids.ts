import { notFound } from "next/navigation";

// Ids chegam às server actions vindos do navegador, e o tipo do TypeScript não vale
// em tempo de execução: um objeto como `{ "not": "" }` viraria um filtro do Prisma.
// Só passa um texto simples no formato dos nossos ids; o resto vira 404.
const FORMATO_DE_ID = /^[A-Za-z0-9_-]{1,64}$/;

export function ehId(valor: unknown): valor is string {
  return typeof valor === "string" && FORMATO_DE_ID.test(valor);
}

export function exigirId(valor: unknown): string {
  if (!ehId(valor)) notFound();
  return valor;
}
