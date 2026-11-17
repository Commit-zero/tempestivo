import type { Metadata } from "next";
import Link from "next/link";
import { Cartao, CabecalhoDaPagina, EstadoVazio } from "@/components/app/pagina";
import { Button } from "@/components/ui/button";
import { dataCivilEmSaoPaulo, ehDataCivil } from "@/lib/datas";
import { AVISO_REGRAS_PENDENTES } from "@/modules/prazos";
import { exigirSessao } from "@/platform/auth";
import { acaoPreverPrazo, acaoSalvarPrazo } from "../acoes";
import { FormularioDePrazo } from "../formulario";
import { carregarOpcoesDoFormulario } from "../opcoes";

export const metadata: Metadata = { title: "Novo prazo" };

const EVENTOS = ["intimacao", "disponibilizacao", "publicacao", "intimacao_tacita"];

// Os parâmetros vêm da URL (atalho de um processo ou rascunho do leitor de intimação):
// cada um é conferido aqui e, de novo, pelo serviço na hora de salvar.
export default async function PaginaDeNovoPrazo({ searchParams }: PageProps<"/prazos/novo">) {
  const { contaId } = await exigirSessao();
  const parametros = await searchParams;
  const texto = (nome: string) => (typeof parametros[nome] === "string" ? (parametros[nome] as string) : "");
  const { processos, tipos } = await carregarOpcoesDoFormulario(contaId);
  const escolhido = processos.find((opcao) => opcao.id === texto("processo"));
  const doRascunho = texto("rascunho") === "1";
  const dias = Number(texto("dias"));
  return (
    <div className="grid max-w-2xl gap-6">
      <CabecalhoDaPagina
        titulo="Novo prazo"
        voltar={{ href: "/prazos", rotulo: "Prazos" }}
        acao={
          <Button asChild variant="outline">
            <Link href="/prazos/intimacao">Ler intimação</Link>
          </Button>
        }
      />
      {doRascunho ? (
        <p role="status" className="rounded-lg border border-atencao/30 bg-atencao-fundo px-3 py-2 text-sm text-atencao">
          Rascunho lido da intimação. Confira cada campo, calcule a data final e só então salve.
        </p>
      ) : null}
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
            avisoDeRegrasPendentes={AVISO_REGRAS_PENDENTES}
            processos={processos}
            tipos={tipos}
            inicial={{
              origem: escolhido && !escolhido.atendido ? "manual" : "calculada",
              processoId: escolhido?.id ?? "",
              descricao: texto("descricao").slice(0, 160),
              tipoEvento: EVENTOS.includes(texto("tipoEvento")) ? texto("tipoEvento") : "intimacao",
              dataEvento: ehDataCivil(texto("dataEvento")) ? texto("dataEvento") : dataCivilEmSaoPaulo(new Date()),
              dias: Number.isInteger(dias) && dias >= 1 && dias <= 365 ? String(dias) : "15",
              contagem: texto("contagem") === "corridos" ? "corridos" : "uteis",
              emDobro: texto("emDobro") === "1",
              dataFinal: "",
            }}
          />
        </Cartao>
      )}
    </div>
  );
}
