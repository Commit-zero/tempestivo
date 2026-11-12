import type { Metadata } from "next";
import { exigirSessao } from "@/platform/auth";

export const metadata: Metadata = { title: "Painel" };

export default async function PaginaDoPainel() {
  const sessao = await exigirSessao();
  return (
    <div className="grid gap-2">
      <h1 className="text-2xl font-semibold tracking-tight">Olá, {sessao.nome.split(" ")[0]}</h1>
    </div>
  );
}
