import type { Metadata } from "next";
import Link from "next/link";
import { Cartao, CabecalhoDaPagina, EstadoVazio } from "@/components/app/pagina";
import { Button } from "@/components/ui/button";
import { dataCivilEmSaoPaulo } from "@/lib/datas";
import { listarProcessos } from "@/modules/processos";
import { exigirSessao } from "@/platform/auth";
import { acaoSalvarAudiencia } from "../acoes";
import { FormularioDeAudiencia } from "../formulario";

export const metadata: Metadata = { title: "Nova audiência" };

export default async function PaginaDeNovaAudiencia() {
  const { contaId } = await exigirSessao();
  const processos = await listarProcessos(contaId, { status: "ativo" });
  return (
    <div className="grid max-w-2xl gap-6">
      <CabecalhoDaPagina titulo="Nova audiência" voltar={{ href: "/audiencias", rotulo: "Audiências" }} />
      {processos.length === 0 ? (
        <EstadoVazio
          titulo="Cadastre um processo primeiro."
          descricao="Toda audiência pertence a um processo ativo."
          acao={
            <Button asChild>
              <Link href="/processos/novo">Novo processo</Link>
            </Button>
          }
        />
      ) : (
        <Cartao>
          <FormularioDeAudiencia
            acao={acaoSalvarAudiencia.bind(null, null)}
            processos={processos.map((processo) => ({ id: processo.id, rotulo: `${processo.cliente.nome} · ${processo.assunto}` }))}
            inicial={{ processoId: "", tipo: "", data: dataCivilEmSaoPaulo(new Date()), hora: "14:00", duracaoMin: "60", local: "", linkVirtual: "", observacoes: "" }}
          />
        </Cartao>
      )}
    </div>
  );
}
