import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronLeft } from "lucide-react";
import { cn } from "cn";

// Blocos de página compartilhados pelas telas da área logada.

export function CabecalhoDaPagina({
  titulo, descricao, voltar, acao,
}: {
  titulo: string;
  descricao?: ReactNode;
  voltar?: { href: string; rotulo: string };
  acao?: ReactNode;
}) {
  return (
    <header className="grid gap-3">
      {voltar ? (
        <Link href={voltar.href} className="inline-flex min-h-11 items-center gap-1 self-start text-sm text-muted-foreground hover:text-foreground md:min-h-0">
          <ChevronLeft className="size-4" aria-hidden="true" />
          {voltar.rotulo}
        </Link>
      ) : null}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid min-w-0 gap-1">
          <h1 className="text-2xl font-semibold tracking-tight text-balance break-words">{titulo}</h1>
          {descricao ? <p className="text-sm text-muted-foreground">{descricao}</p> : null}
        </div>
        {acao}
      </div>
    </header>
  );
}

export function Secao({ titulo, acao, children, className }: { titulo: string; acao?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("grid gap-3", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold tracking-tight">{titulo}</h2>
        {acao}
      </div>
      {children}
    </section>
  );
}

export function Cartao({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("rounded-md border bg-card p-4 sm:p-5", className)}>{children}</div>;
}

export function EstadoVazio({ titulo, descricao, acao }: { titulo: string; descricao?: string; acao?: ReactNode }) {
  return (
    <div className="grid justify-items-center gap-3 rounded-md border border-dashed bg-card px-4 py-10 text-center">
      <p className="font-medium">{titulo}</p>
      {descricao ? <p className="max-w-sm text-sm text-muted-foreground">{descricao}</p> : null}
      {acao}
    </div>
  );
}

/** Lista de itens clicáveis, com alvo de toque confortável no celular. */
export function ListaDeLinks({ children }: { children: ReactNode }) {
  return <ul className="divide-y overflow-hidden rounded-md border bg-card">{children}</ul>;
}

export function ItemDeLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <li>
      <Link href={href} className="foco-interno flex min-h-14 items-center gap-3 px-4 py-3 transition-colors hover:bg-secondary/60">
        {children}
      </Link>
    </li>
  );
}

export function Definicao({ termo, children }: { termo: string; children: ReactNode }) {
  return (
    <div className="grid gap-0.5">
      <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{termo}</dt>
      <dd className="break-words">{children}</dd>
    </div>
  );
}
