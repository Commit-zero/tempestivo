import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Cartao, CabecalhoDaPagina } from "@/components/app/pagina";
import { listarClientes } from "@/modules/clientes";
import { TRIBUNAIS } from "@/modules/prazos";
import { formatarNumeroCnj, obterProcesso } from "@/modules/processos";
import { exigirSessao } from "@/platform/auth";
import { acaoSalvarProcesso } from "../../acoes";
import { FormularioDeProcesso } from "../../formulario";

export const metadata: Metadata = { title: "Editar processo" };

export default async function PaginaDeEdicaoDoProcesso({ params }: PageProps<"/processos/[id]/editar">) {
  const { contaId } = await exigirSessao();
  const { id } = await params;
  const [processo, clientes] = await Promise.all([obterProcesso(contaId, id), listarClientes(contaId)]);
  if (!processo) notFound();
  return (
    <div className="grid max-w-2xl gap-6">
      <CabecalhoDaPagina titulo="Editar processo" voltar={{ href: `/processos/${id}`, rotulo: "Processo" }} />
      <Cartao>
        <FormularioDeProcesso
          acao={acaoSalvarProcesso.bind(null, id)}
          clientes={clientes.map((cliente) => ({ id: cliente.id, nome: cliente.nome }))}
          tribunais={TRIBUNAIS.map(({ sigla, nome }) => ({ sigla, nome }))}
          inicial={{
            clienteId: processo.clienteId,
            numero: formatarNumeroCnj(processo.numero),
            tribunal: processo.tribunal,
            vara: processo.vara ?? "",
            assunto: processo.assunto,
            parteContraria: processo.parteContraria ?? "",
          }}
          rotuloDoBotao="Salvar"
        />
      </Cartao>
    </div>
  );
}
