import Link from "next/link";
import { redirect } from "next/navigation";
import { Marca } from "@/components/app/marca";
import { obterSessao } from "@/platform/auth";

// Telas de entrada: quem já tem sessão vai direto para o painel.
export default async function LayoutPublico({ children }: { children: React.ReactNode }) {
  if (await obterSessao()) redirect("/painel");
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-8 px-4 py-10">
      <Link href="/" aria-label="Tempestivo, página inicial" className="rounded-lg">
        <Marca />
      </Link>
      <main className="w-full max-w-sm rounded-2xl border bg-card p-6 shadow-sm sm:p-8">{children}</main>
      <div className="grid max-w-sm justify-items-center gap-2 text-center text-sm text-muted-foreground">
        <p>Cálculo auxiliar: a conferência do prazo é sempre do advogado.</p>
        <nav aria-label="Documentos" className="flex gap-4">
          <Link href="/termos" className="underline-offset-4 hover:underline">
            Termos de uso
          </Link>
          <Link href="/privacidade" className="underline-offset-4 hover:underline">
            Privacidade
          </Link>
        </nav>
      </div>
    </div>
  );
}
