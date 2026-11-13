import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Cartao, CabecalhoDaPagina } from "@/components/app/pagina";
import { dataCivilEmSaoPaulo } from "@/lib/datas";
import { buscarTribunal, obterPrazo } from "@/modules/prazos";
import { exigirSessao } from "@/platform/auth";
import { acaoPreverPrazo, acaoSalvarPrazo } from "../../acoes";
import { FormularioDePrazo } from "../../formulario";
import { carregarOpcoesDoFormulario } from "../../opcoes";

export const metadata: Metadata = { title: "Editar prazo" };

export default async function PaginaDeEdicaoDoPrazo({ params }: PageProps<"/prazos/[id]/editar">) {
  const { contaId } = await exigirSessao();
  const { id } = await params;
  const [prazo, { tipos }] = await Promise.all([obterPrazo(contaId, id), carregarOpcoesDoFormulario(contaId)]);
  if (!prazo) notFound();
  return (
    <div className="grid max-w-2xl gap-6">
      <CabecalhoDaPagina titulo="Editar prazo" descricao={`${prazo.processo.cliente.nome} · ${prazo.processo.assunto}`} voltar={{ href: `/prazos/${id}`, rotulo: "Prazo" }} />
      <p role="note" className="rounded-lg border border-atencao/30 bg-atencao-fundo px-3 py-2 text-sm text-atencao">
        Mudar a data final ou qualquer dado da contagem zera a conferência: você precisará conferir o prazo de novo. A mudança fica no histórico.
      </p>
      <Cartao>
        <FormularioDePrazo
          editando
          acaoSalvar={acaoSalvarPrazo.bind(null, id)}
          acaoPrever={acaoPreverPrazo}
          processos={[
            { id: prazo.processoId, rotulo: prazo.processo.assunto, tribunal: prazo.processo.tribunal, atendido: buscarTribunal(prazo.processo.tribunal) !== undefined },
          ]}
          tipos={tipos}
          inicial={{
            origem: prazo.origemDataFinal,
            processoId: prazo.processoId,
            descricao: prazo.descricao,
            tipoEvento: prazo.tipoEvento ?? "intimacao",
            dataEvento: prazo.dataEvento ?? dataCivilEmSaoPaulo(new Date()),
            dias: String(prazo.dias ?? 15),
            contagem: prazo.contagem ?? "uteis",
            emDobro: prazo.emDobro,
            dataFinal: prazo.dataFinal,
          }}
        />
      </Cartao>
    </div>
  );
}
