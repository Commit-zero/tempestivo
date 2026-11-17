import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cn } from "cn";
import { FormularioDeExclusao } from "@/components/app/confirmar";
import { Cartao, CabecalhoDaPagina, Definicao, Secao } from "@/components/app/pagina";
import { Button } from "@/components/ui/button";
import { formatarData, formatarDataHora } from "@/lib/datas";
import { formatarReais } from "@/lib/dinheiro";
import { linkDeCobranca, obterHonorario, type SituacaoDaParcela } from "@/modules/honorarios";
import { exigirSessao } from "@/platform/auth";
import { acaoDefinirPagamento, acaoExcluirHonorario } from "../acoes";

export const metadata: Metadata = { title: "Honorário" };

const ROTULO: Record<SituacaoDaParcela, { texto: string; classe: string }> = {
  paga: { texto: "paga", classe: "bg-positivo-fundo text-positivo" },
  em_atraso: { texto: "em atraso", classe: "bg-perigo-fundo text-destructive" },
  vence_hoje: { texto: "vence hoje", classe: "bg-atencao-fundo text-atencao" },
  a_vencer: { texto: "a vencer", classe: "bg-secondary text-secondary-foreground" },
};

export default async function PaginaDoHonorario({ params }: PageProps<"/honorarios/[id]">) {
  const sessao = await exigirSessao();
  const { id } = await params;
  const honorario = await obterHonorario(sessao.contaId, id);
  if (!honorario) notFound();
  return (
    <div className="grid max-w-3xl gap-8">
      <CabecalhoDaPagina titulo={honorario.descricao} voltar={{ href: "/honorarios", rotulo: "Honorários" }} />
      <Cartao>
        <dl className="grid gap-4 sm:grid-cols-2">
          <Definicao termo="Cliente">
            <Link href={`/clientes/${honorario.cliente.id}`} className="text-primary underline-offset-4 hover:underline">
              {honorario.cliente.nome}
            </Link>
          </Definicao>
          <Definicao termo="Processo">
            {honorario.processo ? (
              <Link href={`/processos/${honorario.processo.id}`} className="text-primary underline-offset-4 hover:underline">
                {honorario.processo.assunto}
              </Link>
            ) : (
              "Sem processo vinculado"
            )}
          </Definicao>
          <Definicao termo="Total">{formatarReais(honorario.totalCentavos)}</Definicao>
          <Definicao termo="Recebido">{formatarReais(honorario.recebidoCentavos)}</Definicao>
        </dl>
      </Cartao>

      <Secao titulo="Parcelas">
        {honorario.cliente.telefone ? null : (
          <p className="text-sm text-muted-foreground">
            Para cobrar pelo WhatsApp, cadastre o telefone do cliente em{" "}
            <Link href={`/clientes/${honorario.cliente.id}`} className="text-primary underline-offset-4 hover:underline">
              dados do cliente
            </Link>
            .
          </p>
        )}
        <ul className="divide-y rounded-xl border bg-card">
          {honorario.parcelas.map((parcela) => {
            const cobranca = linkDeCobranca({
              nomeDoCliente: honorario.cliente.nome,
              telefone: honorario.cliente.telefone,
              descricao: honorario.descricao,
              numero: parcela.numero,
              totalDeParcelas: honorario.parcelas.length,
              valorCentavos: parcela.valorCentavos,
              vencimento: parcela.vencimento,
              situacao: parcela.situacao,
              remetente: sessao.nome,
            });
            const paga = parcela.situacao === "paga";
            return (
              <li key={parcela.id} className="grid gap-3 px-4 py-3 sm:flex sm:items-center sm:justify-between">
                <div className="grid gap-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-medium tabular-nums">
                      {parcela.numero}/{honorario.parcelas.length} · {formatarReais(parcela.valorCentavos)}
                    </span>
                    <span className={cn("inline-flex h-6 items-center rounded-full px-2.5 text-xs font-medium", ROTULO[parcela.situacao].classe)}>
                      {ROTULO[parcela.situacao].texto}
                    </span>
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {paga && parcela.pagaEm ? `Paga em ${formatarDataHora(parcela.pagaEm)}` : `Vencimento: ${formatarData(parcela.vencimento)}`}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {cobranca ? (
                    <Button asChild variant="outline">
                      <a href={cobranca} target="_blank" rel="noopener noreferrer">
                        Cobrar pelo WhatsApp
                      </a>
                    </Button>
                  ) : null}
                  <form action={acaoDefinirPagamento.bind(null, parcela.id, !paga)}>
                    <Button type="submit" variant={paga ? "ghost" : "default"} aria-label={`${paga ? "Desfazer o pagamento da" : "Marcar como paga a"} parcela ${parcela.numero}`}>
                      {paga ? "Desfazer" : "Marcar como paga"}
                    </Button>
                  </form>
                </div>
              </li>
            );
          })}
        </ul>
      </Secao>

      <Secao titulo="Excluir honorário">
        <FormularioDeExclusao
          acao={acaoExcluirHonorario.bind(null, id)}
          pergunta="Excluir este honorário e todas as parcelas? Esta ação não pode ser desfeita."
          rotulo="Excluir honorário"
        />
      </Secao>
    </div>
  );
}
