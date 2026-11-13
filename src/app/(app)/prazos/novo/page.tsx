import type { Metadata } from "next";
import Link from "next/link";
import { Cartao, CabecalhoDaPagina, EstadoVazio } from "@/components/app/pagina";
import { Button } from "@/components/ui/button";
import { dataCivilEmSaoPaulo } from "@/lib/datas";
import { exigirSessao } from "@/platform/auth";
import { acaoPreverPrazo, acaoSalvarPrazo } from "../acoes";
import { FormularioDePrazo } from "../formulario";
import { carregarOpcoesDoFormulario } from "../opcoes";

export const metadata: Metadata = { title: "Novo prazo" };

export default async function PaginaDeNovoPrazo({ searchParams }: PageProps<"/prazos/novo">) {
  const { contaId } = await exigirSessao();
  const { processo } = await searchParams;
  const { processos, tipos } = await carregarOpcoesDoFormulario(contaId);
  const escolhido = processos.find((opcao) => opcao.id === processo);
  return (
    <div className="grid max-w-2xl gap-6">
      <CabecalhoDaPagina titulo="Novo prazo" voltar={{ href: "/prazos", rotulo: "Prazos" }} />
      {processos.length === 0 ? (
        <EstadoVazio
          titulo="Cadastre um processo primeiro."
          descricao="Todo prazo nasce de um processo ativo."
          acao={
            <Button asChild>
              <Link href="/processos/novo">Novo processo</Link>
            </Button>
          }
        />
      ) : (
        <Cartao>
          <FormularioDePrazo
            acaoSalvar={acaoSalvarPrazo.bind(null, null)}
            acaoPrever={acaoPreverPrazo}
            processos={processos}
            tipos={tipos}
            inicial={{
              origem: escolhido && !escolhido.atendido ? "manual" : "calculada",
              processoId: escolhido?.id ?? "",
              descricao: "",
              tipoEvento: "intimacao",
              dataEvento: dataCivilEmSaoPaulo(new Date()),
              dias: "15",
              contagem: "uteis",
              emDobro: false,
              dataFinal: "",
            }}
          />
        </Cartao>
      )}
    </div>
  );
}
