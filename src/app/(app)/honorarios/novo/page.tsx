import type { Metadata } from "next";
import Link from "next/link";
import { Cartao, CabecalhoDaPagina, EstadoVazio } from "@/components/app/pagina";
import { Button } from "@/components/ui/button";
import { dataCivilEmSaoPaulo } from "@/lib/datas";
import { listarClientes } from "@/modules/clientes";
import { listarProcessos } from "@/modules/processos";
import { exigirSessao } from "@/platform/auth";
import { acaoCriarHonorario } from "../acoes";
import { FormularioDeHonorario } from "../formulario";

export const metadata: Metadata = { title: "Novo honorário" };

export default async function PaginaDeNovoHonorario() {
  const { contaId } = await exigirSessao();
  const [clientes, processos] = await Promise.all([listarClientes(contaId), listarProcessos(contaId, { status: "ativo" })]);
  return (
    <div className="grid max-w-2xl gap-6">
      <CabecalhoDaPagina titulo="Novo honorário" voltar={{ href: "/honorarios", rotulo: "Honorários" }} />
      {clientes.length === 0 ? (
        <EstadoVazio
          titulo="Cadastre um cliente primeiro."
          descricao="Todo honorário pertence a um cliente."
          acao={
            <Button asChild>
              <Link href="/clientes/novo">Novo cliente</Link>
            </Button>
          }
        />
      ) : (
        <Cartao>
          <FormularioDeHonorario
            acao={acaoCriarHonorario}
            clientes={clientes.map(({ id, nome }) => ({ id, nome }))}
            processos={processos.map(({ id, clienteId, assunto }) => ({ id, clienteId, assunto }))}
            inicial={{ clienteId: "", processoId: "", descricao: "", valorTotal: "", parcelas: "1", primeiroVencimento: dataCivilEmSaoPaulo(new Date()) }}
          />
        </Cartao>
      )}
    </div>
  );
}
