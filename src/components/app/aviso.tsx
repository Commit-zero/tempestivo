import type { ComponentProps } from "react";
import { cn } from "cn";

// O único jeito de avisar no app. A cor tem sempre o mesmo sentido, e a faixa lateral
// mais o texto garantem que nada seja dito só por cor.

export type TipoDeAviso = "sucesso" | "erro" | "atencao" | "informacao";

const CORES: Record<TipoDeAviso, string> = {
  sucesso: "border-positivo bg-positivo-fundo text-positivo",
  erro: "border-destructive bg-perigo-fundo text-destructive",
  atencao: "border-atencao bg-atencao-fundo text-atencao",
  informacao: "border-primary bg-secondary text-secondary-foreground",
};

// Sucesso é anunciado quando der; erro, na hora. Os outros fazem parte da página,
// e quem usa pede o papel quando precisa.
const PAPEIS: Partial<Record<TipoDeAviso, string>> = { sucesso: "status", erro: "alert" };

type Props = ComponentProps<"div"> & {
  tipo: TipoDeAviso;
  como?: "div" | "p" | "ul" | "section";
  /** Texto fixo da página, que o leitor de tela não precisa anunciar como novidade. */
  semAnuncio?: boolean;
};

export function Aviso({ tipo, como = "p", semAnuncio = false, role, className, ...props }: Props) {
  // O elemento muda conforme o conteúdo (parágrafo, lista ou seção), com as mesmas props.
  const Elemento = como as "div";
  return <Elemento role={role ?? (semAnuncio ? undefined : PAPEIS[tipo])} className={cn("rounded-md border-l-4 px-3 py-2 text-sm", CORES[tipo], className)} {...props} />;
}
