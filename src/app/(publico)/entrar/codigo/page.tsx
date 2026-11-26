import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { haPassoPendente } from "@/platform/auth";
import { FormularioDaRecuperacao, FormularioDoCodigo } from "../../formularios";

export const metadata: Metadata = { title: "Código de verificação", robots: { index: false, follow: false } };

const classeDoLink = "text-primary underline-offset-4 hover:underline";

// Segundo passo da entrada: a senha já foi aceita, e a sessão só nasce com o código.
export default async function PaginaDoCodigo({ searchParams }: PageProps<"/entrar/codigo">) {
  if (!(await haPassoPendente())) redirect("/entrar");
  const recuperacao = (await searchParams).recuperacao === "1";
  return (
    <div className="grid gap-6">
      <div className="grid gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">{recuperacao ? "Código de recuperação" : "Código de verificação"}</h1>
        <p className="text-sm text-muted-foreground">
          {recuperacao
            ? "Digite um dos códigos que você guardou ao ligar a verificação em duas etapas. Cada um vale uma vez."
            : "Abra o aplicativo autenticador no celular e digite o código do Tempestivo."}
        </p>
      </div>
      {recuperacao ? <FormularioDaRecuperacao key="recuperacao" /> : <FormularioDoCodigo key="aplicativo" />}
      <div className="grid gap-2 text-sm">
        {recuperacao ? (
          <Link href="/entrar/codigo" className={classeDoLink}>
            Usar o aplicativo autenticador
          </Link>
        ) : (
          <Link href="/entrar/codigo?recuperacao=1" className={classeDoLink}>
            Estou sem o celular: usar um código de recuperação
          </Link>
        )}
        <Link href="/entrar" className={classeDoLink}>
          Voltar para a senha
        </Link>
      </div>
    </div>
  );
}
