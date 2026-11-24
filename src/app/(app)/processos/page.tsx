import type { Metadata } from "next";
import Link from "next/link";
import { Busca } from "@/components/app/busca";
import { CabecalhoDaPagina, EstadoVazio, ItemDeLink, ListaDeLinks } from "@/components/app/pagina";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatarNumeroCnj, listarProcessos, type StatusProcesso } from "@/modules/processos";
import { exigirSessao } from "@/platform/auth";

export const metadata: Metadata = { title: "Processos" };

const FILTROS: { valor: StatusProcesso | "todos"; rotulo: string }[] = [
  { valor: "ativo", rotulo: "Ativos" },
  { valor: "arquivado", rotulo: "Arquivados" },
  { valor: "todos", rotulo: "Todos" },
];

export default async function PaginaDeProcessos({ searchParams }: PageProps<"/processos">) {
  const { contaId } = await exigirSessao();
  const { busca, status } = await searchParams;
  const termo = typeof busca === "string" ? busca : undefined;
  const filtro = FILTROS.find((opcao) => opcao.valor === status)?.valor ?? "ativo";
  const processos = await listarProcessos(contaId, { busca: termo, status: filtro === "todos" ? undefined : filtro });
  const semFiltro = !termo && filtro === "ativo";
  const novo = (
    <Button asChild>
      <Link href="/processos/novo">Novo processo</Link>
    </Button>
  );
  return (
    <div className="grid gap-6">
      <CabecalhoDaPagina titulo="Processos" acao={novo} />
      <Busca rotulo="Buscar por número, assunto ou cliente" valor={termo}>
        <label className="sr-only" htmlFor="status">
          Situação
        </label>
        <select
          id="status"
          name="status"
          defaultValue={filtro}
          className="h-11 rounded-lg border border-input bg-card px-2.5 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:h-9 md:text-sm"
        >
          {FILTROS.map((opcao) => (
            <option key={opcao.valor} value={opcao.valor}>
              {opcao.rotulo}
            </option>
          ))}
        </select>
      </Busca>
      {processos.length === 0 ? (
        <EstadoVazio
          titulo={semFiltro ? "Nenhum processo ativo." : "Nenhum processo encontrado."}
          descricao={semFiltro ? "Cadastre um cliente e abra o primeiro processo para começar a controlar os prazos." : undefined}
          acao={semFiltro ? novo : undefined}
        />
      ) : (
        <ListaDeLinks>
          {processos.map((processo) => (
            <ItemDeLink key={processo.id} href={`/processos/${processo.id}`}>
              <span className="grid min-w-0 flex-1 gap-0.5">
                <span className="font-medium break-words">{processo.assunto}</span>
                <span className="text-sm break-words text-muted-foreground">
                  {processo.cliente.nome} · {formatarNumeroCnj(processo.numero)}
                </span>
              </span>
              <Badge variant={processo.status === "ativo" ? "secondary" : "outline"} className="shrink-0">
                {processo.status === "ativo" ? processo.tribunal : "Arquivado"}
              </Badge>
            </ItemDeLink>
          ))}
        </ListaDeLinks>
      )}
    </div>
  );
}
