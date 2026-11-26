import type { Metadata } from "next";
import Link from "next/link";
import { Marca } from "@/components/app/marca";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Página não encontrada" };

export default function NaoEncontrada() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-8 px-4 py-10">
      <header>
        <Link href="/" aria-label="Tempestivo, página inicial" className="inline-flex min-h-11 items-center rounded-lg">
          <Marca />
        </Link>
      </header>
      <main className="grid w-full max-w-sm justify-items-center gap-4 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Página não encontrada</h1>
        <p className="text-muted-foreground">Erro 404. O endereço pode ter mudado, ou o registro foi excluído.</p>
        <Button asChild>
          <Link href="/painel">Ir para o painel</Link>
        </Button>
      </main>
    </div>
  );
}
