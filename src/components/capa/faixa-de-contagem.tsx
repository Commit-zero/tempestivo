import { cn } from "cn";
import { EXEMPLO_DE_CONTAGEM as exemplo, type DiaDaFaixa } from "@/lib/exemplo-de-contagem";
import { formatarData, nomeDoDiaDaSemana } from "@/lib/datas";

// A peça central da identidade: como a data foi contada, dia a dia. Cada célula se
// explica sem cor (número, traço, hachura e legenda), e o leitor de tela recebe a
// frase inteira de cada dia.

function descrever(dia: DiaDaFaixa): string {
  const inicio = `${nomeDoDiaDaSemana(dia.data)}, ${formatarData(dia.data)}: `;
  if (dia.tipo === "intimacao") return `${inicio}intimação, o dia do começo não conta.`;
  if (dia.tipo === "sem-expediente") return `${inicio}não conta (${dia.motivo}).`;
  const marca = dia.data === exemplo.vencimento ? " Vencimento." : dia.data === exemplo.metaInterna ? " Meta interna." : "";
  return `${inicio}${dia.numero}º dia contado.${marca}`;
}

function Celula({ dia, posicao }: { dia: DiaDaFaixa; posicao: number }) {
  const vencimento = dia.data === exemplo.vencimento;
  const meta = dia.data === exemplo.metaInterna;
  return (
    <li
      style={{ animationDelay: `${posicao * 70}ms` }}
      className={cn(
        "dia-da-faixa grid content-start justify-items-center rounded-sm border px-0.5 pt-1 pb-0.5 text-center [font-stretch:75%]",
        dia.tipo === "sem-expediente" && "faixa-sem-expediente border-dashed",
        dia.tipo === "intimacao" && "border-2 border-foreground",
        meta && "border-2 border-atencao text-atencao",
        vencimento && "border-primary bg-primary text-primary-foreground",
      )}
    >
      <span className="sr-only">{descrever(dia)}</span>
      <span aria-hidden="true" className={cn("text-xs leading-tight", !vencimento && !meta && "text-muted-foreground")}>
        {nomeDoDiaDaSemana(dia.data).slice(0, 3)}
        <br />
        {Number(dia.data.slice(8))}
      </span>
      <span aria-hidden="true" className="text-lg leading-tight font-bold tabular-nums">
        {dia.tipo === "contado" ? dia.numero : dia.tipo === "intimacao" ? "•" : "–"}
      </span>
      <span aria-hidden="true" className="min-h-4 text-xs leading-tight font-semibold">
        {vencimento ? "vence" : meta ? "meta" : ""}
      </span>
    </li>
  );
}

export function FaixaDeContagem() {
  return (
    <figure className="grid gap-4 rounded-md border-t-4 border-primary bg-card p-4 shadow-sm sm:p-5">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span className="text-lg font-bold">
          {exemplo.ato}, {exemplo.dias} dias úteis
        </span>
        <span className="text-sm text-muted-foreground">
          Exemplo fictício, {exemplo.tribunal}. Intimação em {formatarData(exemplo.intimacao)}.
        </span>
      </figcaption>
      <ol
        aria-label="Contagem do prazo, dia a dia"
        // No computador, os 23 dias numa linha só; nas telas menores, quebra em linhas.
        className="grid grid-cols-[repeat(auto-fill,minmax(2.4rem,1fr))] gap-1 lg:grid-cols-[repeat(23,minmax(0,1fr))]"
      >
        {exemplo.faixa.map((dia, posicao) => (
          <Celula key={dia.data} dia={dia} posicao={posicao} />
        ))}
      </ol>
      <p className="text-sm text-muted-foreground">
        O ponto é a intimação, que não conta. Os dias riscados não têm expediente (20/11 é feriado). Os números são os dias úteis
        contados.
      </p>
      <div className="flex flex-wrap gap-x-5 gap-y-1 border-t pt-3">
        <p className="font-bold">Vence em {formatarData(exemplo.vencimento)}</p>
        <p className="font-semibold text-atencao">Meta interna: {formatarData(exemplo.metaInterna)}</p>
        <p className="text-muted-foreground">Cálculo auxiliar, confira. Regras ainda sem validação de um advogado.</p>
      </div>
    </figure>
  );
}
