import Link from "next/link";
import { Marca } from "@/components/app/marca";

// Documentos públicos (termos e privacidade): abertos com ou sem sessão.
export default function LayoutDosDocumentos({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-12">
      <header>
        <Link href="/" aria-label="Tempestivo, página inicial" className="rounded-lg">
          <Marca />
        </Link>
      </header>
      <main
        className="grid gap-4 text-base leading-relaxed [&_h1]:text-3xl [&_h1]:font-semibold [&_h1]:tracking-tight [&_h2]:mt-4 [&_h2]:text-xl [&_h2]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_table]:w-full [&_table]:text-sm [&_td]:border-t [&_td]:py-2 [&_td]:pr-3 [&_td]:align-top [&_th]:pr-3 [&_th]:pb-2 [&_th]:text-left"
      >
        {children}
      </main>
      <footer className="mt-auto flex flex-wrap gap-x-4 border-t pt-6 text-sm text-muted-foreground">
        <Link href="/termos" className="underline-offset-4 hover:underline">
          Termos de uso
        </Link>
        <Link href="/privacidade" className="underline-offset-4 hover:underline">
          Política de privacidade
        </Link>
      </footer>
    </div>
  );
}
