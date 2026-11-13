import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FormularioDeExclusao } from "@/components/app/confirmar";
import { Cartao, CabecalhoDaPagina, Secao } from "@/components/app/pagina";
import { dataEHoraEmSaoPaulo, obterAudiencia } from "@/modules/audiencias";
import { exigirSessao } from "@/platform/auth";
import { acaoExcluirAudiencia, acaoSalvarAudiencia } from "../acoes";
import { FormularioDeAudiencia } from "../formulario";

export const metadata: Metadata = { title: "Audiência" };

export default async function PaginaDaAudiencia({ params }: PageProps<"/audiencias/[id]">) {
  const { contaId } = await exigirSessao();
  const { id } = await params;
  const audiencia = await obterAudiencia(contaId, id);
  if (!audiencia) notFound();
  const { data, hora } = dataEHoraEmSaoPaulo(audiencia.inicio);
  return (
    <div className="grid max-w-2xl gap-8">
      <CabecalhoDaPagina
        titulo={audiencia.tipo}
        descricao={`${audiencia.processo.cliente.nome} · ${audiencia.processo.assunto}`}
        voltar={{ href: "/audiencias", rotulo: "Audiências" }}
      />
      <Cartao>
        <FormularioDeAudiencia
          editando
          acao={acaoSalvarAudiencia.bind(null, id)}
          processos={[]}
          inicial={{
            processoId: audiencia.processoId,
            tipo: audiencia.tipo,
            data,
            hora,
            duracaoMin: String(audiencia.duracaoMin),
            local: audiencia.local ?? "",
            linkVirtual: audiencia.linkVirtual ?? "",
            observacoes: audiencia.observacoes ?? "",
          }}
        />
      </Cartao>
      <Secao titulo="Excluir audiência">
        <FormularioDeExclusao acao={acaoExcluirAudiencia.bind(null, id)} pergunta="Excluir esta audiência? Esta ação não pode ser desfeita." rotulo="Excluir audiência" />
      </Secao>
    </div>
  );
}
