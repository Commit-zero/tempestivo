import { BaixarPlanilha } from "@/components/app/baixar-planilha";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Trash2 } from "lucide-react";
import { ConfirmacaoDoEnvio } from "@/components/app/confirmar";
import { Cartao, CabecalhoDaPagina } from "@/components/app/pagina";
import { Button } from "@/components/ui/button";
import { dataCivilEmSaoPaulo, formatarData } from "@/lib/datas";
import { listarProcessos } from "@/modules/processos";
import { COLUNAS, obterQuadro, type Tarefa } from "@/modules/tarefas";
import { exigirSessao } from "@/platform/auth";
import { acaoCriarTarefa, acaoExcluirTarefa, acaoMoverTarefa } from "./acoes";
import { FormularioDeTarefa } from "./formulario";
import { QuadroComFoco } from "./quadro-com-foco";

export const metadata: Metadata = { title: "Tarefas" };

// Quadro de três colunas. Mover é por botão (funciona com teclado e leitor de tela);
// no celular as colunas ficam empilhadas.
export default async function PaginaDeTarefas() {
  const { contaId } = await exigirSessao();
  const [quadro, processos] = await Promise.all([obterQuadro(contaId), listarProcessos(contaId, { status: "ativo" })]);
  const hoje = dataCivilEmSaoPaulo(new Date());

  function CartaoDaTarefa({ tarefa, indiceDaColuna }: { tarefa: Tarefa; indiceDaColuna: number }) {
    const coluna = COLUNAS[indiceDaColuna];
    const anterior = COLUNAS[indiceDaColuna - 1];
    const proxima = COLUNAS[indiceDaColuna + 1];
    const atrasada = tarefa.limite !== null && tarefa.limite < hoje && tarefa.coluna !== "feito";
    return (
      <li data-tarefa={tarefa.id} data-coluna={coluna.titulo} tabIndex={-1} className="grid grid-cols-[minmax(0,1fr)] gap-2 rounded-lg border bg-card p-3">
        <p className="font-medium wrap-anywhere">{tarefa.titulo}</p>
        {tarefa.processo ? (
          <Link href={`/processos/${tarefa.processo.id}`} className="justify-self-start text-sm wrap-anywhere text-muted-foreground hover:text-foreground">
            {tarefa.processo.assunto}
          </Link>
        ) : null}
        {tarefa.limite ? (
          <p className={atrasada ? "text-sm font-medium text-destructive" : "text-sm text-muted-foreground"}>
            {atrasada ? "Atrasada: " : "Até "}
            {formatarData(tarefa.limite)}
          </p>
        ) : null}
        <div className="flex items-center gap-1">
          {anterior ? (
            <form action={acaoMoverTarefa.bind(null, tarefa.id, anterior.id)} data-mover-tarefa={tarefa.id}>
              <Button type="submit" variant="outline" className="w-11 md:w-9" aria-label={`Mover "${tarefa.titulo}" para ${anterior.titulo}`}>
                <ArrowLeft aria-hidden="true" />
              </Button>
            </form>
          ) : null}
          {proxima ? (
            <form action={acaoMoverTarefa.bind(null, tarefa.id, proxima.id)} data-mover-tarefa={tarefa.id}>
              <Button type="submit" variant="outline" className="w-11 md:w-9" aria-label={`Mover "${tarefa.titulo}" para ${proxima.titulo}`}>
                <ArrowRight aria-hidden="true" />
              </Button>
            </form>
          ) : null}
          <form action={acaoExcluirTarefa.bind(null, tarefa.id)} className="ml-auto">
            <ConfirmacaoDoEnvio titulo="Excluir tarefa?" descricao={`A tarefa "${tarefa.titulo}" será apagada. Não há como desfazer.`} confirmar="Excluir tarefa">
              <Button type="button" variant="ghost" className="w-11 md:w-9" aria-label={`Excluir "${tarefa.titulo}"`}>
                <Trash2 aria-hidden="true" />
              </Button>
            </ConfirmacaoDoEnvio>
          </form>
        </div>
      </li>
    );
  }

  return (
    <div className="grid gap-6">
      <CabecalhoDaPagina titulo="Tarefas" />
      <BaixarPlanilha lista="tarefas" />
      <Cartao className="max-w-2xl">
        <FormularioDeTarefa acao={acaoCriarTarefa} processos={processos.map((processo) => ({ id: processo.id, rotulo: `${processo.cliente.nome} · ${processo.assunto}` }))} />
      </Cartao>
      <QuadroComFoco assinatura={COLUNAS.map((coluna) => quadro[coluna.id].map((tarefa) => tarefa.id).join(",")).join("|")}>
        {COLUNAS.map((coluna, indice) => (
          <section key={coluna.id} aria-label={coluna.titulo} className="grid grid-cols-[minmax(0,1fr)] content-start gap-3 rounded-md bg-muted p-3">
            <h2 className="flex items-center justify-between px-1 text-sm font-semibold">
              {coluna.titulo}
              <span className="text-muted-foreground tabular-nums">
                <span className="sr-only">, </span>
                {quadro[coluna.id].length}
                <span className="sr-only"> {quadro[coluna.id].length === 1 ? "tarefa" : "tarefas"}</span>
              </span>
            </h2>
            {quadro[coluna.id].length === 0 ? (
              <p className="px-1 pb-2 text-sm text-muted-foreground">Nada aqui.</p>
            ) : (
              <ul className="grid grid-cols-[minmax(0,1fr)] gap-2">
                {quadro[coluna.id].map((tarefa) => (
                  <CartaoDaTarefa key={tarefa.id} tarefa={tarefa} indiceDaColuna={indice} />
                ))}
              </ul>
            )}
          </section>
        ))}
      </QuadroComFoco>
    </div>
  );
}
