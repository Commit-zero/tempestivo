import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FormularioDeExclusao } from "@/components/app/confirmar";
import { Cartao, CabecalhoDaPagina, EstadoVazio, ItemDeLink, ListaDeLinks, Secao } from "@/components/app/pagina";
import { Button } from "@/components/ui/button";
import { formatarDocumento } from "@/lib/documento";
import { obterCliente } from "@/modules/clientes";
import { formatarNumeroCnj, listarProcessos } from "@/modules/processos";
import { exigirSessao } from "@/platform/auth";
import { acaoExcluirCliente, acaoSalvarCliente } from "../acoes";
import { FormularioDeCliente } from "../formularios";

export const metadata: Metadata = { title: "Cliente" };

export default async function PaginaDoCliente({ params }: PageProps<"/clientes/[id]">) {
  const { contaId } = await exigirSessao();
  const { id } = await params;
  const cliente = await obterCliente(contaId, id);
  if (!cliente) notFound();
  const processos = await listarProcessos(contaId, { clienteId: id });
  const novoProcesso = (
    <Button asChild variant="outline">
      <Link href={`/processos/novo?cliente=${id}`}>Novo processo</Link>
    </Button>
  );
  return (
    <div className="grid max-w-2xl gap-8">
      <CabecalhoDaPagina titulo={cliente.nome} voltar={{ href: "/clientes", rotulo: "Clientes" }} />
      <Secao titulo="Processos" acao={novoProcesso}>
        {processos.length === 0 ? (
          <EstadoVazio titulo="Nenhum processo deste cliente." />
        ) : (
          <ListaDeLinks>
            {processos.map((processo) => (
              <ItemDeLink key={processo.id} href={`/processos/${processo.id}`}>
                <span className="grid min-w-0 flex-1">
                  <span className="font-medium break-words">{processo.assunto}</span>
                  <span className="text-sm break-words text-muted-foreground">
                    {formatarNumeroCnj(processo.numero)} · {processo.tribunal}
                  </span>
                </span>
              </ItemDeLink>
            ))}
          </ListaDeLinks>
        )}
      </Secao>
      <Secao titulo="Dados do cliente">
        <Cartao>
          <FormularioDeCliente
            acao={acaoSalvarCliente.bind(null, id)}
            rotuloDoBotao="Salvar"
            inicial={{
              nome: cliente.nome,
              documento: cliente.documento ? formatarDocumento(cliente.documento) : "",
              email: cliente.email ?? "",
              telefone: cliente.telefone ?? "",
              observacoes: cliente.observacoes ?? "",
            }}
          />
        </Cartao>
      </Secao>
      <Secao titulo="Excluir cliente">
        <p className="text-sm text-muted-foreground">Só é possível excluir um cliente sem processos e sem honorários.</p>
        <FormularioDeExclusao
          acao={acaoExcluirCliente.bind(null, id)}
          pergunta={`Excluir o cliente ${cliente.nome}? Esta ação não pode ser desfeita.`}
          rotulo="Excluir cliente"
        />
      </Secao>
    </div>
  );
}
