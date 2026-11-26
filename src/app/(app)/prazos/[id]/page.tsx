import { Aviso } from "@/components/app/aviso";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FormularioDeExclusao } from "@/components/app/confirmar";
import { Cartao, CabecalhoDaPagina, Definicao, Secao } from "@/components/app/pagina";
import { SeloDeVencimento, TextoDaConferencia } from "@/components/app/prazo";
import { Button } from "@/components/ui/button";
import { formatarData, formatarDataComSemana, formatarDataHora } from "@/lib/datas";
import { obterPrazo } from "@/modules/prazos";
import { formatarNumeroCnj } from "@/modules/processos";
import { exigirSessao } from "@/platform/auth";
import { acaoConfirmarConferencia, acaoDesfazerCumprido, acaoExcluirPrazo, acaoMarcarComoCumprido } from "../acoes";
import { MemoriaDoCalculo } from "@/components/app/memoria";

export const metadata: Metadata = { title: "Prazo" };

const NOME_DO_CAMPO: Record<string, string> = {
  dataFinal: "Data final", origemDataFinal: "Origem da data", dias: "Dias", contagem: "Contagem", emDobro: "Em dobro",
  tipoEvento: "Tipo de evento", dataEvento: "Data do evento", descricao: "Descrição", status: "Situação",
};
const CAMPOS_DE_DATA = new Set(["dataFinal", "dataEvento"]);

function valorLegivel(campo: string, valor: string | null): string {
  if (valor === null) return "vazio";
  if (CAMPOS_DE_DATA.has(campo)) return formatarData(valor);
  return { true: "sim", false: "não", uteis: "dias úteis", corridos: "dias corridos", calculada: "calculada", manual: "manual" }[valor] ?? valor;
}

export default async function PaginaDoPrazo({ params, searchParams }: PageProps<"/prazos/[id]">) {
  const { contaId } = await exigirSessao();
  const [{ id }, { conferencia }] = await Promise.all([params, searchParams]);
  const prazo = await obterPrazo(contaId, id);
  if (!prazo) notFound();
  const cumprido = prazo.status === "cumprido";
  return (
    <div className="grid max-w-3xl gap-8">
      <CabecalhoDaPagina titulo={prazo.descricao} voltar={{ href: "/prazos", rotulo: "Prazos" }} />

      {conferencia === "zerada" ? (
        <Aviso tipo="atencao" role="status">
          A data do prazo mudou e a conferência foi zerada. Confira de novo e registre.
        </Aviso>
      ) : null}

      <Cartao className="grid gap-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="grid gap-0.5">
            <p className="text-sm text-muted-foreground">
              Data final{prazo.origemDataFinal === "manual" ? " (data manual)" : ""}
            </p>
            <p className="text-2xl font-semibold tracking-tight">{formatarDataComSemana(prazo.dataFinal)}</p>
          </div>
          <SeloDeVencimento situacao={prazo.situacao} />
        </div>
        {prazo.situacao.metaInterna ? (
          <p className={prazo.situacao.metaChegou ? "text-sm font-medium text-atencao" : "text-sm text-muted-foreground"}>
            Meta interna: {formatarDataComSemana(prazo.situacao.metaInterna)}
            {prazo.situacao.metaChegou ? " (já chegou)" : ""}. Data-alvo interna, não é prazo legal.{" "}
            <Link href="/conta" className="text-primary underline-offset-4 hover:underline">
              Ajustar a margem
            </Link>
          </p>
        ) : null}
        {cumprido ? (
          <p className="text-sm text-muted-foreground">Cumprido em {prazo.cumpridoEm ? formatarDataHora(prazo.cumpridoEm) : "data não registrada"}.</p>
        ) : (
          <div className="grid gap-1">
            <TextoDaConferencia situacao={prazo.situacao} className="text-base" />
            <p className="text-sm text-muted-foreground">
              {prazo.ultimaConferenciaEm
                ? `Última conferência: ${formatarDataHora(prazo.ultimaConferenciaEm)}.`
                : "Você ainda não registrou que conferiu este prazo."}
            </p>
          </div>
        )}
        <div className="flex flex-wrap gap-2 border-t pt-4">
          {cumprido ? (
            <form action={acaoDesfazerCumprido.bind(null, id)}>
              <Button type="submit" variant="outline">
                Desfazer cumprido
              </Button>
            </form>
          ) : (
            <>
              <form action={acaoConfirmarConferencia.bind(null, id)}>
                <Button type="submit">Li e conferi</Button>
              </form>
              <form action={acaoMarcarComoCumprido.bind(null, id)}>
                <Button type="submit" variant="outline">
                  Marcar como cumprido
                </Button>
              </form>
              <Button asChild variant="outline">
                <Link href={`/prazos/${id}/editar`}>Editar</Link>
              </Button>
            </>
          )}
        </div>
      </Cartao>

      <Cartao>
        <dl className="grid gap-4 sm:grid-cols-2">
          <Definicao termo="Processo">
            <Link href={`/processos/${prazo.processo.id}`} className="text-primary underline-offset-4 hover:underline">
              {prazo.processo.assunto}
            </Link>
          </Definicao>
          <Definicao termo="Cliente">{prazo.processo.cliente.nome}</Definicao>
          <Definicao termo="Número">{formatarNumeroCnj(prazo.processo.numero)}</Definicao>
          <Definicao termo="Tribunal">{prazo.processo.tribunal}</Definicao>
        </dl>
      </Cartao>

      {prazo.memoriaDoCalculo ? (
        <Secao titulo="Cálculo">
          <MemoriaDoCalculo dataFinal={prazo.dataFinal} {...prazo.memoriaDoCalculo} />
        </Secao>
      ) : (
        <p className="text-sm text-muted-foreground">Data final digitada à mão: este prazo não tem cálculo para mostrar.</p>
      )}

      <Secao titulo="Conferências">
        {prazo.conferencias.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma conferência registrada.</p>
        ) : (
          <ul className="divide-y rounded-xl border bg-card text-sm">
            {prazo.conferencias.map((item) => (
              <li key={item.id} className="flex flex-wrap justify-between gap-2 px-4 py-3">
                <span>{formatarDataHora(item.em)}</span>
                <span className="text-muted-foreground">{item.via === "app" ? "pelo aplicativo" : "pelo link do e-mail"}</span>
              </li>
            ))}
          </ul>
        )}
      </Secao>

      {prazo.historico.length > 0 ? (
        <Secao titulo="Histórico de alterações">
          <ul className="divide-y rounded-xl border bg-card text-sm">
            {prazo.historico.map((item) => (
              <li key={item.id} className="grid gap-0.5 px-4 py-3">
                <span>
                  <span className="font-medium">{NOME_DO_CAMPO[item.campo] ?? item.campo}:</span>{" "}
                  {valorLegivel(item.campo, item.valorAnterior)} → {valorLegivel(item.campo, item.valorNovo)}
                </span>
                <span className="text-muted-foreground">{formatarDataHora(item.em)}</span>
              </li>
            ))}
          </ul>
        </Secao>
      ) : null}

      <Secao titulo="Excluir prazo">
        <FormularioDeExclusao acao={acaoExcluirPrazo.bind(null, id)} pergunta="Excluir este prazo? Esta ação não pode ser desfeita." rotulo="Excluir prazo" />
      </Secao>
    </div>
  );
}
