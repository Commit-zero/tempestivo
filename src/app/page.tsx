import Link from "next/link";
import { Marca } from "@/components/app/marca";
import { Button } from "@/components/ui/button";

const PILARES = [
  {
    titulo: "Prazo com passo a passo",
    texto: "A data final vem com a contagem explicada, dia a dia. O cálculo é auxiliar: quem confere é você.",
  },
  {
    titulo: "Status honesto",
    texto: "Cada prazo mostra há quantos dias você mesmo conferiu. Sem falsa tranquilidade.",
  },
  {
    titulo: "Alertas em camadas",
    texto: "Avisos por e-mail 5, 2 e 1 dia antes. Sem conferência na véspera, o seu substituto é avisado.",
  },
  {
    titulo: "Honorário em dia",
    texto: "Parcelas, atrasos e a cobrança pronta para enviar pelo WhatsApp em um toque.",
  },
];

export default function Home() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col gap-12 px-4 py-8 sm:px-6 sm:py-12">
      <header className="flex items-center justify-between gap-4">
        <Marca />
        <Button asChild variant="outline">
          <Link href="/entrar">Entrar</Link>
        </Button>
      </header>
      <main className="flex flex-col gap-12">
        <section className="flex flex-col items-start gap-6">
          <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            Nunca perca um prazo e receba seus honorários.
          </h1>
          <p className="max-w-xl text-lg text-muted-foreground">
            O Tempestivo é a agenda de prazos do advogado autônomo: calcula, explica, cobra a sua conferência e avisa antes que seja tarde.
          </p>
          <Button asChild size="lg" className="px-5 text-base">
            <Link href="/cadastro">Criar conta gratuita</Link>
          </Button>
        </section>
        <section aria-label="O que o Tempestivo faz" className="grid gap-4 sm:grid-cols-2">
          {PILARES.map(({ titulo, texto }) => (
            <article key={titulo} className="rounded-xl border bg-card p-5">
              <h2 className="font-semibold">{titulo}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{texto}</p>
            </article>
          ))}
        </section>
      </main>
      <footer className="mt-auto border-t pt-6 text-sm text-muted-foreground">
        Cálculo auxiliar, confira. O Tempestivo não substitui a conferência do advogado.
      </footer>
    </div>
  );
}
