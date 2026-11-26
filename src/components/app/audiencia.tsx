import Link from "next/link";
import { formatarDataHora } from "@/lib/datas";
import { linkDeRota, type Audiencia } from "@/modules/audiencias";

const classeDoLink = "min-w-11 justify-center inline-flex min-h-11 items-center text-sm font-medium text-primary underline-offset-4 hover:underline md:min-h-6";

// Cartão de audiência com os atalhos do dia: rota, sala virtual e agenda.
export function ListaDeAudiencias({ audiencias }: { audiencias: Audiencia[] }) {
  return (
    <ul className="divide-y overflow-hidden rounded-md border bg-card">
      {audiencias.map((audiencia) => (
        <li key={audiencia.id} className="grid gap-1.5 px-4 py-3">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3">
            <span className="font-medium">{audiencia.tipo}</span>
            <span className="text-sm font-medium tabular-nums">{formatarDataHora(audiencia.inicio)}</span>
          </div>
          <Link href={`/processos/${audiencia.processo.id}`} className="justify-self-start text-sm wrap-anywhere text-muted-foreground hover:text-foreground">
            {audiencia.processo.cliente.nome} · {audiencia.processo.assunto}
          </Link>
          {audiencia.local ? <span className="text-sm wrap-anywhere">{audiencia.local}</span> : null}
          <div className="flex flex-wrap gap-x-4">
            {audiencia.local ? (
              <a href={linkDeRota(audiencia.local)} target="_blank" rel="noopener noreferrer" className={classeDoLink}>
                Rota
              </a>
            ) : null}
            {audiencia.linkVirtual ? (
              <a href={audiencia.linkVirtual} target="_blank" rel="noopener noreferrer" className={classeDoLink}>
                Sala virtual
              </a>
            ) : null}
            <a href={`/audiencias/${audiencia.id}/agenda.ics`} className={classeDoLink}>
              Adicionar à agenda
            </a>
            <Link href={`/audiencias/${audiencia.id}`} className={classeDoLink}>
              Editar
            </Link>
          </div>
        </li>
      ))}
    </ul>
  );
}
