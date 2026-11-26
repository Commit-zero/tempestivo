import type { Metadata } from "next";
import Link from "next/link";
import { MOTIVOS_DE_RECOMECO } from "@/platform/auth";
import { FormularioDeEntrada } from "../formularios";

export const metadata: Metadata = { title: "Entrar" };

export default async function PaginaDeEntrada({ searchParams }: PageProps<"/entrar">) {
  const { senha, codigo } = await searchParams;
  // O endereço só escolhe entre as mensagens fixas: nada dele é mostrado.
  const recomeco = Object.entries(MOTIVOS_DE_RECOMECO).find(([motivo]) => motivo === codigo)?.[1];
  return (
    <div className="grid gap-6">
      <div className="grid gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Entrar</h1>
        <p className="text-sm text-muted-foreground">Acesse os seus prazos e honorários.</p>
      </div>
      {senha === "redefinida" ? (
        <p role="status" className="rounded-lg border border-positivo/30 bg-positivo-fundo px-3 py-2 text-sm text-positivo">
          Senha alterada. Entre com a nova senha.
        </p>
      ) : null}
      {recomeco ? (
        <p role="alert" className="rounded-lg border border-destructive/30 bg-perigo-fundo px-3 py-2 text-sm text-destructive">
          {recomeco}
        </p>
      ) : null}
      <FormularioDeEntrada />
      <div className="grid gap-2 text-sm">
        <Link href="/recuperar-senha" className="text-primary underline-offset-4 hover:underline">
          Esqueci a senha
        </Link>
        <p className="text-muted-foreground">
          Ainda não tem conta?{" "}
          <Link href="/cadastro" className="text-primary underline-offset-4 hover:underline">
            Criar conta
          </Link>
        </p>
      </div>
    </div>
  );
}
