import type { Metadata } from "next";
import Link from "next/link";
import { cn } from "cn";
import { CabecalhoDaPagina, EstadoVazio } from "@/components/app/pagina";
import { ListaDePrazos } from "@/components/app/prazo";
import { Button } from "@/components/ui/button";
import { FILTROS_DE_PRAZOS, listarPrazos, type FiltroDaLista } from "@/modules/prazos";
import { exigirSessao } from "@/platform/auth";

export const metadata: Metadata = { title: "Prazos" };

const ROTULOS: Record<FiltroDaLista, string> = {
  em_aberto: "Em aberto",
  proximos_7_dias: "Próximos 7 dias",
  vencidos: "Vencidos",
  cumpridos: "Cumpridos",
};

const VAZIO: Record<FiltroDaLista, string> = {
  em_aberto: "Nenhum prazo em aberto.",
  proximos_7_dias: "Nenhum prazo vence nos próximos 7 dias.",
  vencidos: "Nenhum prazo vencido.",
  cumpridos: "Nenhum prazo cumprido ainda.",
};

export default async function PaginaDePrazos({ searchParams }: PageProps<"/prazos">) {
  const { contaId } = await exigirSessao();
  const { filtro: escolhido } = await searchParams;
  const filtro = FILTROS_DE_PRAZOS.find((opcao) => opcao === escolhido) ?? "em_aberto";
  const prazos = await listarPrazos(contaId, { filtro });
  const novo = (
    <Button asChild>
      <Link href="/prazos/novo">Novo prazo</Link>
    </Button>
  );
  return (
    <div className="grid gap-6">
      <CabecalhoDaPagina titulo="Prazos" descricao="Cálculo auxiliar: confira cada prazo e registre a conferência." acao={novo} />
      <nav aria-label="Filtro de prazos" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <ul className="flex w-max gap-2">
          {FILTROS_DE_PRAZOS.map((opcao) => (
            <li key={opcao}>
              <Link
                href={opcao === "em_aberto" ? "/prazos" : `/prazos?filtro=${opcao}`}
                aria-current={opcao === filtro ? "page" : undefined}
                className={cn(
                  "flex h-11 items-center rounded-full border px-4 text-sm font-medium whitespace-nowrap md:h-9",
                  opcao === filtro ? "border-primary bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground",
                )}
              >
                {ROTULOS[opcao]}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      {prazos.length === 0 ? (
        <EstadoVazio
          titulo={VAZIO[filtro]}
          descricao={filtro === "em_aberto" ? "Cadastre um prazo a partir de um processo. A calculadora mostra a contagem passo a passo." : undefined}
          acao={filtro === "em_aberto" ? novo : undefined}
        />
      ) : (
        <ListaDePrazos prazos={prazos} />
      )}
      <Link href="/prazos/catalogo" className="inline-flex min-h-11 items-center md:min-h-6 justify-self-start text-sm text-primary underline-offset-4 hover:underline">
        Catálogo de tipos de prazo e dias sem expediente
      </Link>
    </div>
  );
}
