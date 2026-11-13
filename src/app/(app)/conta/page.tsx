import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Cartao, CabecalhoDaPagina, Secao } from "@/components/app/pagina";
import { obterConta } from "@/modules/conta";
import { exigirSessao } from "@/platform/auth";
import { acaoSalvarConta } from "./acoes";
import { FormularioDaConta } from "./formularios";

export const metadata: Metadata = { title: "Conta" };

export default async function PaginaDaConta() {
  const sessao = await exigirSessao();
  const conta = await obterConta(sessao.contaId);
  if (!conta) notFound();
  return (
    <div className="grid max-w-2xl gap-8">
      <CabecalhoDaPagina titulo="Conta" descricao={sessao.email} />
      <Secao titulo="Dados e alertas">
        <p className="text-sm text-muted-foreground">
          Os alertas de prazo chegam no e-mail da conta 5, 2 e 1 dia antes do vencimento e no próprio dia, com um link para registrar a conferência.
        </p>
        <Cartao>
          <FormularioDaConta
            acao={acaoSalvarConta}
            inicial={{ nome: conta.nome, substitutoNome: conta.substitutoNome ?? "", substitutoEmail: conta.substitutoEmail ?? "" }}
          />
        </Cartao>
      </Secao>
    </div>
  );
}
