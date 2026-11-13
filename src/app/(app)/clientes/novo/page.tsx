import type { Metadata } from "next";
import { Cartao, CabecalhoDaPagina } from "@/components/app/pagina";
import { exigirSessao } from "@/platform/auth";
import { acaoSalvarCliente } from "../acoes";
import { FormularioDeCliente } from "../formularios";

export const metadata: Metadata = { title: "Novo cliente" };

export default async function PaginaDeNovoCliente() {
  await exigirSessao();
  return (
    <div className="grid max-w-2xl gap-6">
      <CabecalhoDaPagina titulo="Novo cliente" voltar={{ href: "/clientes", rotulo: "Clientes" }} />
      <Cartao>
        <FormularioDeCliente acao={acaoSalvarCliente.bind(null, null)} rotuloDoBotao="Cadastrar cliente" />
      </Cartao>
    </div>
  );
}
