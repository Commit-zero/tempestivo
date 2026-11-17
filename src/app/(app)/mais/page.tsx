import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { SECUNDARIOS } from "@/components/app/itens-de-navegacao";
import { Button } from "@/components/ui/button";
import { exigirSessao } from "@/platform/auth";
import { acaoSair } from "../acoes";

export const metadata: Metadata = { title: "Mais" };

// Destinos que não cabem na barra inferior do celular.
export default async function PaginaMais() {
  const sessao = await exigirSessao();
  return (
    <div className="grid gap-6">
      <div className="grid gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Mais</h1>
        <p className="truncate text-sm text-muted-foreground">{sessao.email}</p>
      </div>
      <ul className="divide-y rounded-xl border bg-card">
        {SECUNDARIOS.map(({ href, rotulo, icone: Icone }) => (
          <li key={href}>
            <Link href={href} className="flex min-h-14 items-center gap-3 px-4 font-medium">
              <Icone className="size-5 text-muted-foreground" aria-hidden="true" />
              <span className="flex-1">{rotulo}</span>
              <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
      <form action={acaoSair}>
        <Button type="submit" variant="outline" className="w-full">
          Sair
        </Button>
      </form>
    </div>
  );
}
