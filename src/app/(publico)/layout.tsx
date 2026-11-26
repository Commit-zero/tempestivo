import Link from "next/link";
import { redirect } from "next/navigation";
import { Marca } from "@/components/app/marca";
import { obterSessao } from "@/platform/auth";

// Telas de entrada: quem já tem sessão vai direto para o painel.
export default async function LayoutPublico({ children }: { children: React.ReactNode }) {
  if (await obterSessao()) redirect("/painel");
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-8 px-4 py-10">
      <Link href="/" aria-label="Tempestivo, página inicial" className="inline-flex min-h-11 items-center rounded-lg">
        <Marca />
      </Link>
      <main className="w-full max-w-sm rounded-md border bg-card p-6 shadow-sm sm:p-8">{children}</main>
      <div className="grid max-w-sm justify-items-center gap-2 text-center text-sm text-muted-foreground">
        <p>Cálculo auxiliar: a conferência do prazo é sempre do advogado.</p>
        <nav aria-label="Documentos" className="flex gap-4">
          <Link href="/termos" className="inline-flex min-h-11 items-center underline underline-offset-4 md:min-h-0">
            Termos de uso
          </Link>
          <Link href="/privacidade" className="inline-flex min-h-11 items-center underline underline-offset-4 md:min-h-0">
            Privacidade
          </Link>
        </nav>
      </div>
    </div>
  );
}
