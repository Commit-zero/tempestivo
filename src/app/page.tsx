import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col items-start justify-center gap-6 px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
        Tempestivo
      </h1>
      <p className="text-base text-muted-foreground sm:text-lg">
        Nunca perca um prazo e receba seus honorários.
      </p>
      <Button className="min-h-11" disabled>
        Cadastro em breve
      </Button>
    </main>
  );
}
