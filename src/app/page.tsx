import Link from "next/link";
import { Aviso } from "@/components/app/aviso";
import { Marca } from "@/components/app/marca";
import { Carrossel } from "@/components/capa/carrossel";
import { FaixaDeContagem } from "@/components/capa/faixa-de-contagem";
import { Diferenciais, ProblemasESolucoes } from "@/components/capa/secoes";
import { NOMES_DAS_TELAS, TelasDoProduto } from "@/components/capa/telas";
import { Button } from "@/components/ui/button";

const botaoDaChamada = "h-12 px-6 text-base md:h-12";

function Chamada() {
  return (
    <Button asChild size="lg" className={botaoDaChamada}>
      <Link href="/cadastro">Criar conta gratuita</Link>
    </Button>
  );
}

export default async function Home({ searchParams }: PageProps<"/">) {
  const { conta } = await searchParams;
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col gap-10 px-4 py-6 sm:px-6 sm:py-10">
      <header className="flex items-center justify-between gap-4">
        <Marca />
        <Button asChild variant="outline" className="h-11 px-4 md:h-9">
          <Link href="/entrar">Entrar</Link>
        </Button>
      </header>
      <main className="flex flex-col gap-16 sm:gap-24">
        {conta === "excluida" ? <Aviso tipo="sucesso">A conta e todos os dados foram excluídos.</Aviso> : null}
        <section className="grid gap-8">
          <div className="grid justify-items-start gap-5">
            <h1 className="max-w-[18ch] text-4xl font-extrabold tracking-tight text-balance sm:text-6xl">
              Nunca perca um prazo e receba seus honorários.
            </h1>
            <p className="max-w-[58ch] text-lg text-muted-foreground">
              Para o advogado autônomo. O Tempestivo calcula o prazo, mostra a contagem dia a dia, cobra a sua conferência e
              avisa antes que seja tarde.
            </p>
            <div className="flex flex-wrap gap-3">
              <Chamada />
              <Button asChild size="lg" variant="outline" className={botaoDaChamada}>
                <Link href="/entrar">Já tenho conta</Link>
              </Button>
            </div>
          </div>
          <FaixaDeContagem />
        </section>
        <ProblemasESolucoes />
        <section aria-labelledby="titulo-telas" className="grid min-w-0 gap-6">
          <h2 id="titulo-telas" className="text-2xl font-bold tracking-tight sm:text-3xl">
            Como é por dentro
          </h2>
          <Carrossel rotulo="Telas do Tempestivo" nomes={NOMES_DAS_TELAS}>
            {TelasDoProduto()}
          </Carrossel>
        </section>
        <Diferenciais />
        <section aria-labelledby="titulo-limites" className="grid justify-items-start gap-5 rounded-md bg-secondary p-6 text-secondary-foreground sm:p-10">
          <h2 id="titulo-limites" className="text-2xl font-bold tracking-tight sm:text-3xl">
            O que ele não faz
          </h2>
          <ul className="grid max-w-[65ch] list-disc gap-2 pl-5">
            <li>Não substitui a sua conferência: o cálculo é auxiliar e vale só para o TJSP e o TRT-2. Nos outros, a data é digitada.</li>
            <li>Ele não se conecta a tribunais nem busca intimações sozinho.</li>
            <li>Nesta fase de testes, cadastre só dados fictícios.</li>
          </ul>
          <Chamada />
        </section>
      </main>
      <footer className="mt-auto grid gap-2 border-t pt-6 text-sm text-muted-foreground">
        <p>Cálculo auxiliar, confira. O Tempestivo não substitui a conferência do advogado.</p>
        <nav aria-label="Documentos" className="flex flex-wrap gap-x-4">
          <Link href="/termos" className="flex min-h-11 items-center underline underline-offset-4 md:min-h-0">
            Termos de uso
          </Link>
          <Link href="/privacidade" className="flex min-h-11 items-center underline underline-offset-4 md:min-h-0">
            Política de privacidade
          </Link>
        </nav>
      </footer>
    </div>
  );
}
