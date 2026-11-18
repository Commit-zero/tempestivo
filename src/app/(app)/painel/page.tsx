import type { Metadata } from "next";
import Link from "next/link";
import { ListaDeAudiencias } from "@/components/app/audiencia";
import { AvisoDeConfirmacaoDeEmail } from "@/components/app/confirmar-email";
import { EstadoVazio, Secao } from "@/components/app/pagina";
import { ListaDePrazos } from "@/components/app/prazo";
import { ResumoFinanceiro } from "@/components/app/resumo-financeiro";
import { Button } from "@/components/ui/button";
import { dataCivilEmSaoPaulo, formatarDataComSemana } from "@/lib/datas";
import { listarProximasAudiencias } from "@/modules/audiencias";
import { resumoFinanceiro } from "@/modules/honorarios";
import { listarPrazos } from "@/modules/prazos";
import { obterQuadro } from "@/modules/tarefas";
import { exigirSessao } from "@/platform/auth";
import { acaoReenviarConfirmacao } from "../acoes";

export const metadata: Metadata = { title: "Painel" };

const SETE_DIAS = 7 * 24 * 60 * 60 * 1000;

function plural(quantidade: number, singular: string, variosTexto: string): string {
  return quantidade === 1 ? `1 ${singular}` : `${quantidade} ${variosTexto}`;
}

// A tela que o advogado abre de manhã no celular: primeiro o que pede ação hoje,
// depois a semana, a agenda e o dinheiro.
export default async function PaginaDoPainel({ searchParams }: PageProps<"/painel">) {
  const sessao = await exigirSessao();
  const { email } = await searchParams;
  const agora = new Date();
  const [emAberto, audiencias, financeiro, quadro] = await Promise.all([
    listarPrazos(sessao.contaId, { filtro: "em_aberto" }, agora),
    listarProximasAudiencias(sessao.contaId, agora),
    resumoFinanceiro(sessao.contaId, agora),
    obterQuadro(sessao.contaId),
  ]);

  const urgentes = emAberto.filter((prazo) => prazo.situacao.vencido || prazo.situacao.urgencia === "hoje");
  const daSemana = emAberto.filter((prazo) => prazo.situacao.urgencia === "proximo");
  // Meta interna chegou: o trabalho já devia estar pronto, mesmo faltando dias para o vencimento.
  const metaChegou = emAberto.filter((prazo) => prazo.situacao.metaChegou && !urgentes.includes(prazo));
  const semConferencia = emAberto.filter((prazo) => prazo.situacao.conferenciaAtrasada && !urgentes.includes(prazo) && !daSemana.includes(prazo));
  const audienciasDaSemana = audiencias.filter((audiencia) => audiencia.inicio.getTime() - agora.getTime() <= SETE_DIAS);
  const tarefasAbertas = quadro.a_fazer.length + quadro.fazendo.length;
  const temHonorarios = financeiro.aReceberCentavos > 0 || financeiro.recebidoNoMesCentavos > 0;
  const contaVazia = emAberto.length === 0 && audiencias.length === 0 && !temHonorarios && tarefasAbertas === 0;

  return (
    <div className="grid gap-8">
      <header className="grid gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Olá, {sessao.nome.split(" ")[0]}</h1>
        <p className="text-sm text-muted-foreground first-letter:uppercase">{formatarDataComSemana(dataCivilEmSaoPaulo(agora))}</p>
      </header>

      {sessao.emailConfirmado ? (
        email === "confirmado" ? (
          <p role="status" className="rounded-xl border border-positivo/30 bg-positivo-fundo px-4 py-3 text-sm text-positivo">
            E-mail confirmado. Os alertas de prazo chegam neste endereço.
          </p>
        ) : null
      ) : (
        <AvisoDeConfirmacaoDeEmail email={sessao.email} acao={acaoReenviarConfirmacao} />
      )}

      {contaVazia ? (
        <EstadoVazio
          titulo="Comece pelo primeiro prazo."
          descricao="Cadastre um cliente, abra o processo dele e registre o prazo. A calculadora mostra a contagem passo a passo e você confirma."
          acao={
            <Button asChild>
              <Link href="/clientes/novo">Cadastrar cliente</Link>
            </Button>
          }
        />
      ) : (
        <>
          <Secao titulo="Pede a sua atenção hoje">
            {urgentes.length === 0 ? (
              <p className="rounded-xl border bg-positivo-fundo px-4 py-3 text-sm text-positivo">Nenhum prazo vencido ou vencendo hoje.</p>
            ) : (
              <ListaDePrazos prazos={urgentes} />
            )}
          </Secao>

          {metaChegou.length > 0 ? (
            <Secao titulo={`Meta interna chegou (${metaChegou.length})`}>
              <p className="text-sm text-muted-foreground">Prazos que ainda não venceram, mas cujo trabalho já devia estar pronto.</p>
              <ListaDePrazos prazos={metaChegou} />
            </Secao>
          ) : null}

          {daSemana.length > 0 ? (
            <Secao
              titulo="Vencem nos próximos 7 dias"
              acao={
                <Link href="/prazos?filtro=proximos_7_dias" className="inline-flex min-h-11 items-center md:min-h-6 text-sm text-primary underline-offset-4 hover:underline">
                  Ver todos
                </Link>
              }
            >
              <ListaDePrazos prazos={daSemana} />
            </Secao>
          ) : null}

          {semConferencia.length > 0 ? (
            <Secao titulo={`Sem conferência há 3 dias ou mais (${semConferencia.length})`}>
              <p className="text-sm text-muted-foreground">Prazos mais distantes que você não confere há algum tempo. Abra, confira a data e registre.</p>
              <ListaDePrazos prazos={semConferencia.slice(0, 5)} />
            </Secao>
          ) : null}

          {audienciasDaSemana.length > 0 ? (
            <Secao titulo="Audiências da semana">
              <ListaDeAudiencias audiencias={audienciasDaSemana} />
            </Secao>
          ) : null}

          {temHonorarios ? (
            <Secao
              titulo="Honorários"
              acao={
                <Link href="/honorarios" className="inline-flex min-h-11 items-center md:min-h-6 text-sm text-primary underline-offset-4 hover:underline">
                  Ver honorários
                </Link>
              }
            >
              <ResumoFinanceiro resumo={financeiro} />
            </Secao>
          ) : null}

          {tarefasAbertas > 0 ? (
            <p className="text-sm text-muted-foreground">
              Você tem {plural(tarefasAbertas, "tarefa em aberto", "tarefas em aberto")}.{" "}
              <Link href="/tarefas" className="text-primary underline-offset-4 hover:underline">
                Abrir o quadro
              </Link>
            </p>
          ) : null}
        </>
      )}

      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline">
          <Link href="/prazos/novo">Novo prazo</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/prazos/intimacao">Ler intimação</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/processos/novo">Novo processo</Link>
        </Button>
      </div>
    </div>
  );
}
