import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FormularioDeExclusao } from "@/components/app/confirmar";
import { Cartao, CabecalhoDaPagina, Definicao, EstadoVazio, Secao } from "@/components/app/pagina";
import { ListaDePrazos } from "@/components/app/prazo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { listarPrazos } from "@/modules/prazos";
import { formatarNumeroCnj, obterProcesso } from "@/modules/processos";
import { exigirSessao } from "@/platform/auth";
import { acaoExcluirProcesso, acaoMudarStatusDoProcesso } from "../acoes";

export const metadata: Metadata = { title: "Processo" };

export default async function PaginaDoProcesso({ params }: PageProps<"/processos/[id]">) {
  const { contaId } = await exigirSessao();
  const { id } = await params;
  const processo = await obterProcesso(contaId, id);
  if (!processo) notFound();
  const [emAberto, cumpridos] = await Promise.all([
    listarPrazos(contaId, { processoId: id }),
    listarPrazos(contaId, { processoId: id, filtro: "cumpridos" }),
  ]);
  const prazos = [...emAberto, ...cumpridos];
  const arquivado = processo.status === "arquivado";
  return (
    <div className="grid max-w-3xl gap-8">
      <CabecalhoDaPagina
        titulo={processo.assunto}
        descricao={formatarNumeroCnj(processo.numero)}
        voltar={{ href: "/processos", rotulo: "Processos" }}
        acao={arquivado ? <Badge variant="outline">Arquivado</Badge> : null}
      />
      <Cartao>
        <dl className="grid gap-4 sm:grid-cols-2">
          <Definicao termo="Cliente">
            <Link href={`/clientes/${processo.cliente.id}`} className="text-primary underline-offset-4 hover:underline">
              {processo.cliente.nome}
            </Link>
          </Definicao>
          <Definicao termo="Tribunal">{processo.tribunal}</Definicao>
          <Definicao termo="Vara">{processo.vara ?? "Não informada"}</Definicao>
          <Definicao termo="Parte contrária">{processo.parteContraria ?? "Não informada"}</Definicao>
        </dl>
        <div className="mt-5 flex flex-wrap gap-2 border-t pt-4">
          <Button asChild variant="outline">
            <Link href={`/processos/${id}/editar`}>Editar</Link>
          </Button>
          <form action={acaoMudarStatusDoProcesso.bind(null, id, arquivado ? "ativo" : "arquivado")}>
            <Button type="submit" variant="outline">
              {arquivado ? "Reativar" : "Arquivar"}
            </Button>
          </form>
        </div>
      </Cartao>
      <Secao
        titulo="Prazos"
        acao={
          arquivado ? null : (
            <Button asChild variant="outline">
              <Link href={`/prazos/novo?processo=${id}`}>Novo prazo</Link>
            </Button>
          )
        }
      >
        {prazos.length === 0 ? <EstadoVazio titulo="Nenhum prazo neste processo." /> : <ListaDePrazos prazos={prazos} mostrarProcesso={false} />}
      </Secao>
      <Secao titulo="Excluir processo">
        <p className="text-sm text-muted-foreground">
          Excluir o processo apaga também os prazos e as audiências dele. Para só tirar da lista, arquive.
        </p>
        <FormularioDeExclusao
          acao={acaoExcluirProcesso.bind(null, id)}
          pergunta="Excluir este processo, com os prazos e as audiências dele? Esta ação não pode ser desfeita."
          rotulo="Excluir processo"
        />
      </Secao>
    </div>
  );
}
