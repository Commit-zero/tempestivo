import type { Metadata } from "next";
import { CabecalhoDaPagina } from "@/components/app/pagina";
import { exigirSessao } from "@/platform/auth";
import { LeitorDeIntimacao } from "./leitor";

export const metadata: Metadata = { title: "Ler intimação" };

export default async function PaginaDoLeitorDeIntimacao() {
  await exigirSessao();
  return (
    <div className="grid max-w-2xl gap-6">
      <CabecalhoDaPagina
        titulo="Ler intimação"
        descricao="Cole o texto e o Tempestivo monta um rascunho do prazo para você conferir."
        voltar={{ href: "/prazos", rotulo: "Prazos" }}
      />
      <LeitorDeIntimacao />
    </div>
  );
}
