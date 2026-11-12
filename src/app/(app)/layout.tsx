import Link from "next/link";
import { Marca } from "@/components/app/marca";
import { NavegacaoInferior, NavegacaoLateral } from "@/components/app/navegacao";
import { Button } from "@/components/ui/button";
import { exigirSessao } from "@/platform/auth";
import { acaoSair } from "./acoes";

// Área logada. A sessão é validada no servidor a cada requisição; cada página e
// cada ação repete a validação antes de tocar em dados.
export default async function LayoutDoApp({ children }: { children: React.ReactNode }) {
  const sessao = await exigirSessao();
  return (
    <div className="min-h-dvh md:grid md:grid-cols-[15rem_1fr]">
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-2 focus:rounded-lg focus:bg-card focus:px-3 focus:py-2">
        Pular para o conteúdo
      </a>
      <aside className="sticky top-0 hidden h-dvh flex-col gap-6 border-r bg-card p-4 md:flex">
        <Link href="/painel" className="rounded-lg px-1">
          <Marca />
        </Link>
        <NavegacaoLateral />
        <div className="mt-auto grid gap-2 border-t pt-4">
          <p className="truncate px-1 text-sm font-medium" title={sessao.email}>
            {sessao.nome}
          </p>
          <form action={acaoSair}>
            <Button type="submit" variant="outline" className="w-full">
              Sair
            </Button>
          </form>
        </div>
      </aside>
      <div className="flex min-w-0 flex-col">
        <header className="flex items-center justify-between border-b bg-card px-4 py-3 md:hidden">
          <Link href="/painel" className="rounded-lg">
            <Marca />
          </Link>
        </header>
        <main id="conteudo" className="mx-auto w-full max-w-5xl flex-1 px-4 pt-6 pb-24 sm:px-6 md:pb-10">
          {children}
        </main>
      </div>
      <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-card pb-[env(safe-area-inset-bottom)] md:hidden">
        <NavegacaoInferior />
      </div>
    </div>
  );
}
