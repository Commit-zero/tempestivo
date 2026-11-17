import type { Metadata } from "next";
import Link from "next/link";
import { Marca } from "@/components/app/marca";
import { formatarDataComSemana } from "@/lib/datas";
import { obterPrazoDoLink } from "@/modules/alertas";
import { FormularioDeConferencia } from "./formulario";
import { acaoConfirmarPeloLink } from "./acoes";

// O token na URL é a credencial: a página não pode ser indexada nem vazar o endereço por referência.
export const metadata: Metadata = { title: "Conferir prazo", robots: { index: false, follow: false }, referrer: "no-referrer" };

// Página do link "li e conferi" do e-mail. Abrir o link só mostra o prazo: a
// conferência é registrada quando o advogado aperta o botão (um POST), para que
// antivírus e pré-visualizadores de e-mail não confirmem nada sozinhos.
export default async function PaginaDeConferencia({ params }: PageProps<"/conferir/[token]">) {
  const { token } = await params;
  const prazo = await obterPrazoDoLink(token);
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-8 px-4 py-10">
      <Marca />
      <main className="grid w-full max-w-sm gap-5 rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
        {prazo?.jaConferidoPorEsteLink ? (
          <>
            <h1 className="text-2xl font-semibold tracking-tight">Conferência registrada</h1>
            <p role="status" className="text-sm text-muted-foreground">
              A conferência por este link já foi registrada. Para ver o prazo, entre no Tempestivo.
            </p>
          </>
        ) : prazo ? (
          <>
            <div className="grid gap-1">
              <h1 className="text-2xl font-semibold tracking-tight">Conferir prazo</h1>
              <p className="text-sm text-muted-foreground">{prazo.assuntoDoProcesso}</p>
            </div>
            <dl className="grid gap-3">
              <div>
                <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Prazo</dt>
                <dd className="font-medium break-words">{prazo.descricao}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Data final</dt>
                <dd className="text-xl font-semibold tracking-tight">{formatarDataComSemana(prazo.dataFinal)}</dd>
              </div>
            </dl>
            <p className="rounded-lg border border-atencao/30 bg-atencao-fundo px-3 py-2 text-sm text-atencao">
              Cálculo auxiliar, confira. Só registre depois de conferir a data nos autos.
            </p>
            <FormularioDeConferencia acao={acaoConfirmarPeloLink.bind(null, token)} cumprido={prazo.cumprido} />
          </>
        ) : (
          <>
            <h1 className="text-2xl font-semibold tracking-tight">Link inválido</h1>
            <p role="alert" className="text-sm text-muted-foreground">
              Este link é inválido ou expirou. Entre no Tempestivo para conferir o prazo.
            </p>
          </>
        )}
        <Link href="/entrar" className="text-sm text-primary underline-offset-4 hover:underline">
          Entrar no Tempestivo
        </Link>
      </main>
    </div>
  );
}
