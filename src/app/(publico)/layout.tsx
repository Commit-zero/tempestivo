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
      <p className="max-w-sm text-center text-sm text-muted-foreground">
        Cálculo auxiliar: a conferência do prazo é sempre do advogado.
      </p>
    </div>
  );
}
