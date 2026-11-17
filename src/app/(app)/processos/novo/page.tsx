import type { Metadata } from "next";
import Link from "next/link";
import { Cartao, CabecalhoDaPagina, EstadoVazio } from "@/components/app/pagina";
import { Button } from "@/components/ui/button";
import { listarClientes } from "@/modules/clientes";
import { TRIBUNAIS } from "@/modules/prazos";
import { exigirSessao } from "@/platform/auth";
import { acaoSalvarProcesso } from "../acoes";
import { FormularioDeProcesso } from "../formulario";

export const metadata: Metadata = { title: "Novo processo" };

export default async function PaginaDeNovoProcesso({ searchParams }: PageProps<"/processos/novo">) {
  const { contaId } = await exigirSessao();
  const { cliente } = await searchParams;
  const clientes = await listarClientes(contaId);
  return (
    <div className="grid max-w-2xl gap-6">
      <CabecalhoDaPagina titulo="Novo processo" voltar={{ href: "/processos", rotulo: "Processos" }} />
      {clientes.length === 0 ? (
        <EstadoVazio
          titulo="Cadastre um cliente primeiro."
          descricao="Todo processo pertence a um cliente."
          acao={
            <Button asChild>
              <Link href="/clientes/novo">Novo cliente</Link>
            </Button>
          }
        />
      ) : (
        <Cartao>
          <FormularioDeProcesso
            acao={acaoSalvarProcesso.bind(null, null)}
            clientes={clientes.map(({ id, nome }) => ({ id, nome }))}
            tribunais={TRIBUNAIS.map(({ sigla, nome }) => ({ sigla, nome }))}
            inicial={{ clienteId: typeof cliente === "string" ? cliente : "", tribunal: "TJSP" }}
            rotuloDoBotao="Cadastrar processo"
          />
        </Cartao>
      )}
    </div>
  );
}
