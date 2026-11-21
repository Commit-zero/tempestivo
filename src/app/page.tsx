import Link from "next/link";
import { BellRing, CalendarCheck2, CalendarSync, CircleDollarSign, ListChecks, ShieldCheck } from "lucide-react";
import { Marca } from "@/components/app/marca";
import { Button } from "@/components/ui/button";

const PILARES = [
  {
    icone: ListChecks,
    titulo: "Prazo com passo a passo",
    texto: "A data final vem com a contagem explicada, dia a dia, e as regras usadas. O cálculo é auxiliar: quem confere é você.",
  },
  {
    icone: ShieldCheck,
    titulo: "Status honesto",
    texto: "Cada prazo mostra há quantos dias você mesmo conferiu. Sem falsa tranquilidade.",
  },
  {
    icone: CalendarSync,
    titulo: "Meta interna e agenda no celular",
    texto: "O trabalho tem data para ficar pronto antes do vencimento, e prazos, metas e audiências aparecem no calendário que você já usa.",
  },
  {
    icone: BellRing,
    titulo: "Alertas e substituto",
    texto: "E-mails 5, 2 e 1 dia útil antes. Sem conferência na véspera, um colega de confiança é avisado.",
  },
  {
    icone: CircleDollarSign,
    titulo: "Honorário em dia",
    texto: "Parcelas, atrasos e a cobrança pronta para enviar pelo WhatsApp em um toque.",
  },
  {
    icone: CalendarCheck2,
    titulo: "Leitor de intimação",
    texto: "Cole o texto e receba um rascunho do prazo, com o trecho de onde saiu cada dado. Nada é enviado a terceiros.",
  },
];

/** Prévia de um prazo como ele aparece no app, com dados fictícios. */
function PreviaDoPrazo() {
  return (
    <figure className="grid gap-3">
      <div className="grid gap-4 rounded-2xl border bg-card p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="grid gap-0.5">
            <p className="font-medium">Contestação</p>
            <p className="text-sm text-muted-foreground">Ação de cobrança · TJSP</p>
          </div>
          <span className="inline-flex h-6 shrink-0 items-center rounded-full bg-atencao-fundo px-2.5 text-xs font-medium text-atencao">
            vence em 4 dias
          </span>
        </div>
        <div className="grid gap-0.5">
          <p className="text-sm text-muted-foreground">Data final calculada</p>
          <p className="text-2xl font-semibold tracking-tight">04/12/2026 (sexta-feira)</p>
          <p className="text-sm text-atencao">Meta interna: 02/12/2026 (quarta-feira)</p>
        </div>
        <ol className="grid list-decimal gap-1 pl-5 text-sm text-muted-foreground">
          <li>Intimação em 12/11/2026: o dia do começo não entra na contagem.</li>
          <li>A contagem começa em 13/11/2026, o primeiro dia útil seguinte.</li>
          <li>Dias sem expediente no período: 20/11/2026 (feriado: Consciência Negra).</li>
        </ol>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-sm">
          <span className="text-positivo">conferido hoje</span>
          <span className="text-muted-foreground">Cálculo auxiliar, confira.</span>
        </div>
      </div>
      <figcaption className="text-center text-xs text-muted-foreground">Exemplo com dados fictícios.</figcaption>
    </figure>
  );
}

export default async function Home({ searchParams }: PageProps<"/">) {
  const { conta } = await searchParams;
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col gap-14 px-4 py-6 sm:px-6 sm:py-10">
      <header className="flex items-center justify-between gap-4">
        <Marca />
        <Button asChild variant="outline">
          <Link href="/entrar">Entrar</Link>
        </Button>
      </header>
      <main className="flex flex-col gap-16">
        {conta === "excluida" ? (
          <p role="status" className="rounded-lg border border-positivo/30 bg-positivo-fundo px-3 py-2 text-sm text-positivo">
            A conta e todos os dados foram excluídos.
          </p>
        ) : null}
        <section className="grid items-center gap-10 md:grid-cols-[1.1fr_1fr]">
          <div className="flex flex-col items-start gap-6">
            <p className="text-sm font-medium tracking-wide text-atencao uppercase">Para o advogado autônomo</p>
            <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">Nunca perca um prazo e receba seus honorários.</h1>
            <p className="max-w-xl text-lg text-muted-foreground">
              O Tempestivo calcula o prazo e explica a contagem, cobra a sua conferência, coloca a meta interna no seu calendário e
              avisa antes que seja tarde.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg" className="px-5 text-base">
                <Link href="/cadastro">Criar conta gratuita</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="px-5 text-base">
                <Link href="/entrar">Já tenho conta</Link>
              </Button>
            </div>
          </div>
          <PreviaDoPrazo />
        </section>
        <section aria-labelledby="titulo-recursos" className="grid gap-6">
          <h2 id="titulo-recursos" className="text-2xl font-semibold tracking-tight">
            O que o Tempestivo faz por você
          </h2>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {PILARES.map(({ icone: Icone, titulo, texto }) => (
              <li key={titulo} className="grid content-start gap-2 rounded-xl border bg-card p-5">
                <span className="inline-flex size-10 items-center justify-center rounded-lg bg-secondary text-primary">
                  <Icone className="size-5" aria-hidden="true" />
                </span>
                <h3 className="font-semibold">{titulo}</h3>
                <p className="text-sm text-muted-foreground">{texto}</p>
              </li>
            ))}
          </ul>
        </section>
      </main>
      <footer className="mt-auto grid gap-2 border-t pt-6 text-sm text-muted-foreground">
        <p>Cálculo auxiliar, confira. O Tempestivo não substitui a conferência do advogado.</p>
        <nav aria-label="Documentos" className="flex flex-wrap gap-x-4">
          <Link href="/termos" className="underline-offset-4 hover:underline">
            Termos de uso
          </Link>
          <Link href="/privacidade" className="underline-offset-4 hover:underline">
            Política de privacidade
          </Link>
        </nav>
      </footer>
    </div>
  );
}
