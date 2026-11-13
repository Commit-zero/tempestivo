import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Cartao, CabecalhoDaPagina, Secao } from "@/components/app/pagina";
import { obterConta } from "@/modules/conta";
import { exigirSessao } from "@/platform/auth";
import { Button } from "@/components/ui/button";
import { acaoExcluirConta, acaoSalvarConta } from "./acoes";
import { FormularioDaConta, FormularioDeExclusaoDaConta } from "./formularios";

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
      <Secao titulo="Seus dados">
        <p className="text-sm text-muted-foreground">
          Baixe uma cópia de tudo o que a conta guarda (clientes, processos, prazos, audiências, honorários e tarefas) em um arquivo JSON. O arquivo contém dados pessoais dos seus clientes: guarde-o com cuidado.
        </p>
        <Button asChild variant="outline" className="sm:justify-self-start sm:px-5">
          <a href="/conta/exportar">Exportar os dados</a>
        </Button>
      </Secao>
      <Secao titulo="Excluir a conta">
        <p className="text-sm text-muted-foreground">
          Apaga para sempre a conta, o login e todos os dados. Não há como desfazer; exporte os dados antes se precisar deles.
        </p>
        <Cartao>
          <FormularioDeExclusaoDaConta acao={acaoExcluirConta} email={sessao.email} />
        </Cartao>
      </Secao>
    </div>
  );
}
