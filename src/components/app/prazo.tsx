import Link from "next/link";
import { cn } from "cn";
import { formatarData } from "@/lib/datas";
import type { PrazoComSituacao, Situacao } from "@/modules/prazos";

// Apresentação de um prazo, compartilhada pela lista, pelo painel e pela página do processo.

const corDaUrgencia: Record<Situacao["urgencia"], string> = {
  vencido: "bg-perigo-fundo text-destructive",
  hoje: "bg-atencao-fundo text-atencao",
  proximo: "bg-atencao-fundo text-atencao",
  normal: "bg-secondary text-secondary-foreground",
  cumprido: "bg-positivo-fundo text-positivo",
};

export function SeloDeVencimento({ situacao, className }: { situacao: Situacao; className?: string }) {
  return (
    <span className={cn("inline-flex h-6 shrink-0 items-center rounded-full px-2.5 text-xs font-medium", corDaUrgencia[situacao.urgencia], className)}>
      {situacao.quando}
    </span>
  );
}

/** Status honesto: o que o advogado conferiu e há quanto tempo. */
export function TextoDaConferencia({ situacao, className }: { situacao: Situacao; className?: string }) {
  if (!situacao.conferencia) return null;
  return (
    <span className={cn("text-sm", situacao.conferenciaAtrasada ? "font-medium text-atencao" : "text-muted-foreground", className)}>
      {situacao.conferencia}
    </span>
  );
}

export function ListaDePrazos({ prazos, mostrarProcesso = true }: { prazos: PrazoComSituacao[]; mostrarProcesso?: boolean }) {
  return (
    <ul className="divide-y overflow-hidden rounded-xl border bg-card">
      {prazos.map((prazo) => (
        <li key={prazo.id}>
          <Link href={`/prazos/${prazo.id}`} className="grid gap-1.5 px-4 py-3 transition-colors hover:bg-secondary/60">
            <span className="flex items-start justify-between gap-3">
              <span className="min-w-0 font-medium break-words">{prazo.descricao}</span>
              <SeloDeVencimento situacao={prazo.situacao} />
            </span>
            {mostrarProcesso ? (
              <span className="truncate text-sm text-muted-foreground">
                {prazo.processo.cliente.nome} · {prazo.processo.assunto}
              </span>
            ) : null}
            <span className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm">
              <span className="tabular-nums">
                {formatarData(prazo.dataFinal)}
                {prazo.origemDataFinal === "manual" ? <span className="text-muted-foreground"> · data manual</span> : null}
              </span>
              <TextoDaConferencia situacao={prazo.situacao} />
              {prazo.situacao.metaInterna ? (
                <span className={prazo.situacao.metaChegou ? "font-medium text-atencao" : "text-muted-foreground"}>
                  meta interna {formatarData(prazo.situacao.metaInterna)}
                </span>
              ) : null}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
