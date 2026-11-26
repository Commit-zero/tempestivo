import type { Metadata } from "next";
import Link from "next/link";
import { FormularioDePedidoDeRedefinicao } from "../formularios";

export const metadata: Metadata = { title: "Recuperar a senha" };

export default function PaginaDeRecuperacao() {
  return (
    <div className="grid gap-6">
      <div className="grid gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Recuperar a senha</h1>
        <p className="text-sm text-muted-foreground">Informe o e-mail da conta. Enviaremos um link para criar uma nova senha.</p>
      </div>
      <FormularioDePedidoDeRedefinicao />
      <Link href="/entrar" className="inline-flex min-h-11 items-center justify-self-start text-sm text-primary underline underline-offset-4 md:min-h-0">
        Voltar para a entrada
      </Link>
    </div>
  );
}
