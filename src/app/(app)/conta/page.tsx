import { BaixarPlanilha } from "@/components/app/baixar-planilha";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Cartao, CabecalhoDaPagina, Secao } from "@/components/app/pagina";
import { formatarDataHora } from "@/lib/datas";
import { MARGEM_MAXIMA, obterConta } from "@/modules/conta";
import { exigirSessao, segundoFatorLigado } from "@/platform/auth";
import { Button } from "@/components/ui/button";
import {
  acaoAtivarAgenda, acaoConfirmarSegundoFator, acaoDefinirMargem, acaoDesativarAgenda, acaoDesativarSegundoFator, acaoExcluirConta,
  acaoGerarCodigos, acaoIniciarSegundoFator, acaoSalvarConta, acaoTrocarSenha,
} from "./acoes";
import { FormularioDaMargem, PainelDaAgenda } from "./agenda";
import { FormularioDaConta, FormularioDeExclusaoDaConta } from "./formularios";
import { SegundoFator } from "./segundo-fator";
import { FormularioDeTrocaDeSenha } from "./seguranca";

export const metadata: Metadata = { title: "Conta" };

export default async function PaginaDaConta({ searchParams }: PageProps<"/conta">) {
  const sessao = await exigirSessao();
  const conta = await obterConta(sessao.contaId);
  if (!conta) notFound();
  const comSegundoFator = await segundoFatorLigado(sessao.usuarioId);
  const guardouOsCodigos = (await searchParams).codigos === "guardados";
  return (
    <div className="grid max-w-2xl gap-8">
      <CabecalhoDaPagina titulo="Conta" descricao={sessao.email} />
      <Secao titulo="Dados e alertas">
        <p className="text-sm text-muted-foreground">
          Os alertas de prazo chegam no e-mail da conta 5, 2 e 1 dia antes do vencimento e no próprio dia, com um link para registrar a conferência.
        </p>
        {conta.substitutoEmail ? (
          <p role="status" className={conta.substitutoConfirmadoEm ? "text-sm text-positivo" : "text-sm text-atencao"}>
            {conta.substitutoConfirmadoEm
              ? `O substituto aceitou o convite em ${formatarDataHora(conta.substitutoConfirmadoEm)} e recebe os avisos de véspera.`
              : "Aguardando o substituto aceitar o convite enviado ao e-mail dele. Até lá, ele não recebe avisos."}
          </p>
        ) : null}
        <Cartao>
          <FormularioDaConta
            acao={acaoSalvarConta}
            inicial={{ nome: conta.nome, substitutoNome: conta.substitutoNome ?? "", substitutoEmail: conta.substitutoEmail ?? "" }}
          />
        </Cartao>
      </Secao>
      <Secao titulo="Meta interna e agenda no celular">
        <p className="text-sm text-muted-foreground">
          A meta interna é a data para ter o trabalho pronto, alguns dias úteis antes do vencimento. Ela aparece em cada prazo e no painel.
        </p>
        <Cartao>
          <FormularioDaMargem acao={acaoDefinirMargem} margem={conta.margemDeSegurancaDiasUteis} maxima={MARGEM_MAXIMA} />
        </Cartao>
        <p className="text-sm text-muted-foreground">
          Assine a agenda uma vez no calendário do celular e os prazos, as metas internas e as audiências aparecem lá sozinhos, com
          lembretes. O calendário (Google, Apple ou Microsoft) recebe a descrição que você deu a cada prazo, o número do processo, o local
          das audiências e as datas. Nomes de clientes, de partes, o assunto e o link de sala virtual nunca vão para ele: evite escrever
          nomes na descrição dos prazos.
        </p>
        <Cartao>
          <PainelDaAgenda
            ativadaEm={conta.agendaAtivadaEm ? formatarDataHora(conta.agendaAtivadaEm) : null}
            acaoAtivar={acaoAtivarAgenda}
            acaoDesativar={acaoDesativarAgenda}
          />
        </Cartao>
      </Secao>
      <Secao titulo="Segurança">
        <p className="text-sm text-muted-foreground">
          Ao trocar a senha, as sessões abertas em outros aparelhos são encerradas e você recebe um aviso por e-mail.
        </p>
        <Cartao>
          <FormularioDeTrocaDeSenha acao={acaoTrocarSenha} email={sessao.email} />
        </Cartao>
      </Secao>
      <Secao titulo="Verificação em duas etapas">
        <p className="text-sm text-muted-foreground">
          Além da senha, o login passa a pedir um código do aplicativo autenticador no seu celular. Assim, uma senha vazada não basta
          para abrir a conta.
        </p>
        <Cartao>
          <SegundoFator
            ligado={comSegundoFator}
            focarAoAbrir={guardouOsCodigos}
            emailConfirmado={sessao.emailConfirmado}
            acaoIniciar={acaoIniciarSegundoFator}
            acaoConfirmar={acaoConfirmarSegundoFator}
            acaoGerarCodigos={acaoGerarCodigos}
            acaoDesativar={acaoDesativarSegundoFator}
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
        <p className="text-sm text-muted-foreground">
          Para trabalhar no Excel, baixe a planilha completa: uma aba para cada lista e um resumo. Prazos levam “cálculo auxiliar,
          confira”.
        </p>
        <BaixarPlanilha lista="completa" rotulo="Baixar a planilha completa" />
      </Secao>
      <Secao titulo="Excluir a conta">
        <p className="text-sm text-muted-foreground">
          Apaga para sempre a conta, o login e todos os dados. Não há como desfazer; exporte os dados antes se precisar deles.
        </p>
        <Cartao>
          <FormularioDeExclusaoDaConta acao={acaoExcluirConta} />
        </Cartao>
      </Secao>
    </div>
  );
}
