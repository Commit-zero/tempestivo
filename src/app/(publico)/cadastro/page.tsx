import type { Metadata } from "next";
import Link from "next/link";
import { TAMANHO_MINIMO_DA_SENHA } from "@/platform/auth";
import { FormularioDeCadastro } from "../formularios";

export const metadata: Metadata = { title: "Criar conta" };

export default function PaginaDeCadastro() {
  return (
    <div className="grid gap-6">
      <div className="grid gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Criar conta</h1>
        <p className="text-sm text-muted-foreground">Leva um minuto. Sem cartão.</p>
      </div>
      <FormularioDeCadastro tamanhoMinimoDaSenha={TAMANHO_MINIMO_DA_SENHA} />
      <p className="text-sm text-muted-foreground">
        Já tem conta?{" "}
        <Link href="/entrar" className="text-primary underline-offset-4 hover:underline">
          Entrar
        </Link>
      </p>
    </div>
  );
}
