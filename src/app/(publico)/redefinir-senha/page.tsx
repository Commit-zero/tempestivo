import { Aviso } from "@/components/app/aviso";
import type { Metadata } from "next";
import Link from "next/link";
import { FormularioDeNovaSenha } from "../formularios";

export const metadata: Metadata = { title: "Nova senha" };

export default async function PaginaDeNovaSenha({ searchParams }: PageProps<"/redefinir-senha">) {
  const { token, error } = await searchParams;
  const tokenValido = typeof token === "string" && token.length > 0 && !error;
  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Nova senha</h1>
      {tokenValido ? (
        <FormularioDeNovaSenha token={token} />
      ) : (
        <div className="grid gap-4">
          <Aviso tipo="erro">
            O link de redefinição é inválido ou expirou.
          </Aviso>
          <Link href="/recuperar-senha" className="text-sm text-primary underline-offset-4 hover:underline">
            Pedir um novo link
          </Link>
        </div>
      )}
    </div>
  );
}
