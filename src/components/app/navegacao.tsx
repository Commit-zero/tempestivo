"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { cn } from "cn";
import { PRINCIPAIS, SECUNDARIOS, type ItemDeNavegacao } from "./itens-de-navegacao";

function ativo(caminho: string, href: string): boolean {
  return caminho === href || caminho.startsWith(`${href}/`);
}

/** Barra lateral a partir de 768 px. */
export function NavegacaoLateral() {
  const caminho = usePathname();
  return (
    <nav aria-label="Principal" className="grid gap-1">
      {[...PRINCIPAIS, ...SECUNDARIOS].map(({ href, rotulo, icone: Icone }) => (
        <Link
          key={href}
          href={href}
          aria-current={ativo(caminho, href) ? "page" : undefined}
          className={cn(
            "flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
            ativo(caminho, href) && "bg-secondary text-primary",
          )}
        >
          <Icone className="size-4.5" aria-hidden="true" />
          {rotulo}
        </Link>
      ))}
    </nav>
  );
}

/** Barra inferior no celular: quatro destinos e "Mais". */
export function NavegacaoInferior() {
  const caminho = usePathname();
  const emMais = caminho === "/mais" || SECUNDARIOS.some((item) => ativo(caminho, item.href));
  const itens: (ItemDeNavegacao & { atual: boolean })[] = [
    ...PRINCIPAIS.map((item) => ({ ...item, atual: ativo(caminho, item.href) })),
    { href: "/mais", rotulo: "Mais", icone: Menu, atual: emMais },
  ];
  return (
    <nav aria-label="Principal" className="grid grid-cols-5">
      {itens.map(({ href, rotulo, icone: Icone, atual }) => (
        <Link
          key={href}
          href={href}
          aria-current={atual ? "page" : undefined}
          className={cn(
            "flex min-h-14 flex-col items-center justify-center gap-0.5 text-[0.7rem] font-medium text-muted-foreground",
            atual && "text-primary",
          )}
        >
          <Icone className="size-5" aria-hidden="true" />
          {rotulo}
        </Link>
      ))}
    </nav>
  );
}
