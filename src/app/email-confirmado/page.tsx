import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Marca } from "@/components/app/marca";
import { Button } from "@/components/ui/button";
import { obterSessao } from "@/platform/auth";

export const metadata: Metadata = { title: "Confirmação de e-mail", robots: { index: false, follow: false } };

// Destino do link de confirmação. O link não abre sessão: quem não está conectado
// vê o resultado aqui e entra com a senha. Fica fora das telas de entrada porque
// elas mandam quem tem sessão para o painel, perdendo o resultado.
export default async function PaginaDeEmailConfirmado({ searchParams }: PageProps<"/email-confirmado">) {
  const { error } = await searchParams;
  if (await obterSessao()) redirect(error ? "/painel" : "/painel?email=confirmado");
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-8 px-4 py-10">
      <Marca />
      <main className="grid w-full max-w-sm gap-5 rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
        {error ? (
          <>
            <h1 className="text-2xl font-semibold tracking-tight">Link inválido ou vencido</h1>
            <p role="alert" className="text-sm text-muted-foreground">
              Não foi possível confirmar o e-mail com este link. Entre na sua conta e peça um novo no painel.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-semibold tracking-tight">E-mail confirmado</h1>
            <p role="status" className="text-sm text-muted-foreground">
              Os alertas de prazo chegam neste endereço. Entre com a sua senha para continuar.
            </p>
          </>
        )}
        <Button asChild>
          <Link href="/entrar">Entrar</Link>
        </Button>
      </main>
    </div>
  );
}
