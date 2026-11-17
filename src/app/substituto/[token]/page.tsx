import type { Metadata } from "next";
import Link from "next/link";
import { Marca } from "@/components/app/marca";
import { obterConviteDeSubstituto } from "@/modules/conta";
import { acaoAceitarConvite } from "./acoes";
import { FormularioDeAceite } from "./formulario";

// O token na URL é a credencial: a página não pode ser indexada nem vazar o endereço por referência.
export const metadata: Metadata = { title: "Convite de substituto", robots: { index: false, follow: false }, referrer: "no-referrer" };

// Abrir o link só mostra o convite: o aceite é um clique (POST), para que antivírus
// e pré-visualizadores de e-mail não aceitem nada sozinhos.
export default async function PaginaDoConvite({ params }: PageProps<"/substituto/[token]">) {
  const { token } = await params;
  const convite = await obterConviteDeSubstituto(token);
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-8 px-4 py-10">
      <Marca />
      <main className="grid w-full max-w-sm gap-5 rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
        {convite ? (
          <>
            <h1 className="text-2xl font-semibold tracking-tight">Ser advogado substituto</h1>
            <p className="text-sm break-words">
              <strong>{convite.titular}</strong> indicou você como substituto no Tempestivo.
            </p>
            <ul className="grid list-disc gap-1.5 pl-5 text-sm text-muted-foreground">
              <li>Você recebe um e-mail quando um prazo dessa pessoa chegar à véspera sem conferência.</li>
              <li>O e-mail traz só a data do prazo, nunca o processo ou o cliente.</li>
              <li>Você não ganha acesso a nenhum dado e não precisa criar conta.</li>
            </ul>
            <FormularioDeAceite acao={acaoAceitarConvite.bind(null, token)} />
          </>
        ) : (
          <>
            <h1 className="text-2xl font-semibold tracking-tight">Convite inválido</h1>
            <p role="alert" className="text-sm text-muted-foreground">
              Este convite é inválido, expirou ou já foi aceito.
            </p>
          </>
        )}
        <Link href="/" className="text-sm text-primary underline-offset-4 hover:underline">
          Conhecer o Tempestivo
        </Link>
      </main>
    </div>
  );
}
